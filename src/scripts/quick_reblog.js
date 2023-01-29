import { timelineObject } from '../util/react_props.js';
import { apiFetch } from '../util/tumblr_helpers.js';
import { postSelector, postType } from '../util/interface.js';
import { userBlogs } from '../util/user.js';
import { getPreferences } from '../util/preferences.js';
import { notify } from '../util/notifications.js';
import { translate } from '../util/language_data.js';
import { dom } from '../util/dom.js';

const blogSelector = document.createElement('select');
const blogAvatar = dom('div', { class: 'avatar' });
const commentInput = Object.assign(document.createElement('input'), {
  placeholder: 'Comment',
  autocomplete: 'off',
  onkeydown: event => event.stopPropagation()
});
const quickTagsList = Object.assign(document.createElement('div'), {
  className: 'quick-tags',
  tabIndex: -1
});
const tagsInput = Object.assign(document.createElement('input'), {
  placeholder: 'Tags (comma separated)',
  autocomplete: 'off',
  onkeydown: event => event.stopPropagation()
});
tagsInput.setAttribute('list', 'quick-reblog-tag-suggestions');
const tagSuggestions = Object.assign(document.createElement('datalist'), { id: 'quick-reblog-tag-suggestions' });
const actionButtons = Object.assign(document.createElement('fieldset'), { className: 'action-buttons' });
const reblogButton = Object.assign(document.createElement('button'), { textContent: 'Reblog' });
reblogButton.dataset.state = 'published';
const queueButton = Object.assign(document.createElement('button'), { textContent: 'Queue' });
queueButton.dataset.state = 'queue';
const draftButton = Object.assign(document.createElement('button'), { textContent: 'Draft' });
draftButton.dataset.state = 'draft';

let lastPostID;
let suggestableTags;

let rememberLastBlog;
let showTagsInput;
let showTagSuggestions;
let reblogTag;
let queueTag;
let alreadyRebloggedEnabled;
let alreadyRebloggedLimit;

let longpress = false;
let presstimer = null;

const alreadyRebloggedStorageKey = 'quick_reblog.alreadyRebloggedList';
const rememberedBlogStorageKey = 'quick_reblog.rememberedBlogs';
const quickTagsStorageKey = 'quick_tags.preferences.tagBundles';
const blogHashes = {};

const reblogButtonSelector = `
${postSelector} footer a[href*="/reblog/"],
${postSelector} footer button[aria-label="${translate('Reblog')}"]:not([role])
`;

const renderBlogAvatar = async () => {
  const { value: selectedUuid } = blogSelector;
  const { avatar } = userBlogs.find(({ uuid }) => uuid === selectedUuid);
  const { url } = avatar[avatar.length - 1];
  blogAvatar.style.backgroundImage = `url(${url})`;
};
blogSelector.addEventListener('change', renderBlogAvatar);

const renderTagSuggestions = () => {
  tagSuggestions.textContent = '';
  if (!showTagSuggestions) return;

  const currentTags = tagsInput.value
    .split(',')
    .map(tag => tag.trim().toLowerCase())
    .filter(tag => tag !== '');

  const includeSpace = !tagsInput.value.endsWith(' ') && tagsInput.value.trim() !== '';

  const tagsToSuggest = suggestableTags
    .filter(tag => !currentTags.includes(tag.toLowerCase()))
    .filter((tag, index, array) => array.indexOf(tag) === index)
    .map(tag => `${tagsInput.value}${includeSpace ? ' ' : ''}${tag}`);

  tagSuggestions.append(
    ...tagsToSuggest.map(value => Object.assign(document.createElement('option'), { value }))
  );
};

const setLastPostId = (currentTarget) => {
  const thisPost = currentTarget.closest(postSelector);
  const thisPostID = thisPost.dataset.id;
  if (thisPostID !== lastPostID) {
    if (!rememberLastBlog) {
      blogSelector.value = blogSelector.options[0].value;
      renderBlogAvatar();
    }
    commentInput.value = '';
    [...quickTagsList.children].forEach(({ dataset }) => delete dataset.checked);
    tagsInput.value = '';
    timelineObject(thisPost).then(({ tags, trail, content, layout, blogName, rebloggedRootName }) => {
      suggestableTags = tags;
      if (blogName) suggestableTags.push(blogName);
      if (rebloggedRootName) suggestableTags.push(rebloggedRootName);
      suggestableTags.push(postType({ trail, content, layout }));
      renderTagSuggestions();
    });
  }
  lastPostID = thisPostID;
}

const reblogOnLongClick = async ({ currentTarget }) => {
  setLastPostId(currentTarget);

  const currentReblogButton = currentTarget.parentElement.parentElement.parentElement.parentElement.parentElement;

  actionButtons.disabled = true;
  lastPostID = null;

  const postElement = currentTarget.closest(postSelector);
  const postID = postElement.dataset.id;
  const state = 'published'

  const blog = blogSelector.value;
  const tags = [
    ...tagsInput.value.split(','),
    ...reblogTag ? [reblogTag] : [],
    ...(state === 'queue' && queueTag) ? [queueTag] : []
  ].join(',');
  const { blog: { uuid: parentTumblelogUUID }, reblogKey, rebloggedRootId } = await timelineObject(postElement);

  const requestPath = `/v2/blog/${blog}/posts`;

  const requestBody = {
    content: commentInput.value ? [{ formatting: [], type: 'text', text: commentInput.value }] : [],
    tags,
    parent_post_id: postID,
    parent_tumblelog_uuid: parentTumblelogUUID,
    reblog_key: reblogKey,
    state
  };

  try {
    const { meta, response } = await apiFetch(requestPath, { method: 'POST', body: requestBody });
    if (meta.status === 201) {
      currentReblogButton.classList.add('published')

      notify(response.displayText);

      if (alreadyRebloggedEnabled) {
        const { [alreadyRebloggedStorageKey]: alreadyRebloggedList = [] } = await browser.storage.local.get(alreadyRebloggedStorageKey);
        const rootID = rebloggedRootId || postID;

        if (alreadyRebloggedList.includes(rootID) === false) {
          alreadyRebloggedList.push(rootID);
          alreadyRebloggedList.splice(0, alreadyRebloggedList.length - alreadyRebloggedLimit);
          await browser.storage.local.set({ [alreadyRebloggedStorageKey]: alreadyRebloggedList });
        }
      }
    }
  } catch ({ body }) {
    notify(body.errors[0].detail);
  } finally {
    actionButtons.disabled = false;
  }

};

const cancelLongPress = function(e) {
  if (presstimer !== null) {
      clearTimeout(presstimer);
      presstimer = null;
  }
};

const startLongPress = function(e) {
  if (e.type === "click" && e.button !== 0) {
      return;
  }

  longpress = false;

  if (presstimer === null) {
      presstimer = setTimeout(function() {
          reblogOnLongClick(e);
          longpress = true;
          // this prevents the short click opening the usual reblog modal
          e.currentTarget.style.pointerEvents = 'none';
      }, 500);
  }

  return false;
};

export const main = async function () {
  ({
    rememberLastBlog,
    showTagsInput,
    showTagSuggestions,
    reblogTag,
    queueTag,
    alreadyRebloggedEnabled,
    alreadyRebloggedLimit
  } = await getPreferences('quick_reblog'));

  blogSelector.replaceChildren(
    ...userBlogs.map(({ name, uuid }) => Object.assign(document.createElement('option'), { value: uuid, textContent: name }))
  );

  $(document.body).on('mousedown', reblogButtonSelector, startLongPress);
  $(document.body).on('touchstart', reblogButtonSelector, startLongPress);
  $(document.body).on('mouseout', reblogButtonSelector, cancelLongPress);
  $(document.body).on('touchend', reblogButtonSelector, cancelLongPress);
  $(document.body).on('touchleave', reblogButtonSelector, cancelLongPress);
  $(document.body).on('touchcancel', reblogButtonSelector, cancelLongPress);
};

export const clean = async function () {
  $(document.body).off('mousedown', reblogButtonSelector, startLongPress);
  $(document.body).off('touchstart', reblogButtonSelector, startLongPress);
  $(document.body).off('mouseout', reblogButtonSelector, cancelLongPress);
  $(document.body).off('touchend', reblogButtonSelector, cancelLongPress);
  $(document.body).off('touchleave', reblogButtonSelector, cancelLongPress);
  $(document.body).off('touchcancel', reblogButtonSelector, cancelLongPress);
};

export const stylesheet = true;
