import { timelineObject } from '../util/react_props.js';
import { apiFetch } from '../util/tumblr_helpers.js';
import { userBlogs } from '../util/user.js';

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

function absorbEvent(event) {
  var e = event || window.event;
  e.preventDefault && e.preventDefault();
  e.stopPropagation && e.stopPropagation();
  e.cancelBubble = true;
  e.returnValue = false;
  return false;
}

function start(event) {
  var e = event || window.event;
  reblogOnLongClick(e)
  e.preventDefault && e.preventDefault();
  e.stopPropagation && e.stopPropagation();
  e.cancelBubble = true;
  e.returnValue = false;
  return false;
}

function preventLongPressMenu(node) {
  node.ontouchstart = start;
  node.ontouchmove = absorbEvent;
  node.ontouchend = absorbEvent;
  node.ontouchcancel = absorbEvent;
}

function removeListeners(node) {
  node.removeEventListener('ontouchstart', start)
  node.removeEventListener('ontouchmove', absorbEvent)
  node.removeEventListener('ontouchend', absorbEvent)
  node.removeEventListener('ontouchcancel', absorbEvent)
}

const affectedElements = []

export const main = async function () {
  var elems = document.querySelectorAll(reblogButtonSelector);

  for(let i = 0; i< elems.length; i++) {
    const ancestor = elems[i].parentElement.parentElement.parentElement

    const children = ancestor.getElementsByTagName('*')
    for(let j = 0; j< children.length; j++) {
      affectedElements.push(children[j])
    }
  }

  for(let j = 0; j< affectedElements.length; j++) {
    preventLongPressMenu(affectedElements[j])
  }
};

export const clean = async function () {
  for(let j = 0; j< affectedElements.length; j++) {
    removeListeners(affectedElements[j])
  }
};

export const stylesheet = true;
