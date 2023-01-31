import { timelineObject } from '../util/react_props.js';
import { apiFetch } from '../util/tumblr_helpers.js';
import { userBlogs } from '../util/user.js';

let pressTimer = null;
const postSelector = '[tabindex="-1"][data-id]';

const reblogButtonSelector = `
${postSelector} footer a[href*="/reblog/"],
${postSelector} footer button[aria-label="Reblog"]:not([role])
`;

const reblogOnLongClick = async ({ currentTarget }) => {
  const currentReblogButton = currentTarget.parentElement.parentElement.parentElement.parentElement.parentElement;

  const postElement = currentTarget.closest(postSelector);
  const postID = postElement.dataset.id;
  const state = 'published'

  const blog = userBlogs[0].uuid;
  const tags = ''
  const { blog: { uuid: parentTumblelogUUID }, reblogKey } = await timelineObject(postElement);

  const requestPath = `/v2/blog/${blog}/posts`;

  const requestBody = {
    content: [],
    tags,
    parent_post_id: postID,
    parent_tumblelog_uuid: parentTumblelogUUID,
    reblog_key: reblogKey,
    state
  };

  try {
    const { meta } = await apiFetch(requestPath, { method: 'POST', body: requestBody });
    if (meta.status === 201) {
      currentReblogButton.classList.add('published')
    }
  } catch ({ body }) {
    console.log(body.errors[0].detail);
  }
};

const cancelLongPress = function(e) {
  if (pressTimer !== null) {
      clearTimeout(pressTimer);
      pressTimer = null;
  }
};

const startLongPress = function(e) {
  if (e.type === "click" && e.button !== 0) {
      return;
  }

  if (pressTimer === null) {
      pressTimer = setTimeout(function() {
          reblogOnLongClick(e);
          // this prevents the short click opening the usual reblog modal
          e.currentTarget.style.pointerEvents = 'none';
      }, 500);
  }

  return false;
};

export const main = async function () {
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
