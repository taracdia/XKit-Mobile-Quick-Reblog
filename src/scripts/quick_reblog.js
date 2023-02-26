import { timelineObject } from '../util/react_props.js';
import { apiFetch } from '../util/tumblr_helpers.js';
import { userBlogs } from '../util/user.js';

const postSelector = '[tabindex="-1"][data-id]';

const reblogButtonSelectorInDashboard = `
${postSelector} footer a[href*="/reblog/"],
${postSelector} footer button[aria-label="Reblog"]:not([role])
`;

const reblogButtonSelectorOutsideOfDashboard = `div.control.reblog-control`;

const reblogOnLongClick = async ({ currentTarget }, location) => {
  console.log('reblog')
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

function startDash(event) {
  var e = event || window.event;
  reblogOnLongClick(e, 'dashboard')
  e.preventDefault && e.preventDefault();
  e.stopPropagation && e.stopPropagation();
  e.cancelBubble = true;
  e.returnValue = false;
  return false;
}

function startOutside(event) {
  var e = event || window.event;
  reblogOnLongClick(e, 'outside')
  e.preventDefault && e.preventDefault();
  e.stopPropagation && e.stopPropagation();
  e.cancelBubble = true;
  e.returnValue = false;
  return false;
}

function preventLongPressMenuDash(node, location) {
  if (location === 'dashboard'){
    node.ontouchstart = startDash;
  } else {
  node.ontouchstart = startOutside;
  }
  node.ontouchmove = absorbEvent;
  node.ontouchend = absorbEvent;
  node.ontouchcancel = absorbEvent;
  node.oncontextmenu = absorbEvent;
}

function removeListeners(node) {
  node.removeEventListener('ontouchstart', startDash)
  node.removeEventListener('ontouchstart', startOutside)
  node.removeEventListener('ontouchmove', absorbEvent)
  node.removeEventListener('ontouchend', absorbEvent)
  node.removeEventListener('ontouchcancel', absorbEvent)
  node.removeEventListener('oncontextmenu', absorbEvent)
}

let affectedElements = []

function getAffectedElementsInDash(){
  var elems = document.querySelectorAll(reblogButtonSelectorInDashboard);
  const affected = []

  for(let i = 0; i< elems.length; i++) {
    const ancestor = elems[i].parentElement.parentElement.parentElement

    const children = ancestor.getElementsByTagName('*')
    for(let j = 0; j< children.length; j++) {
      affected.push(children[j])
    }
  }

  return affected
}

function getAffectedElementsOutside(){
  var elems = document.querySelectorAll(reblogButtonSelectorOutsideOfDashboard);
  const affected = [elems]

  for(let i = 0; i< elems.length; i++) {
    const children = elems[i].getElementsByTagName('*')
    for(let j = 0; j< children.length; j++) {
      affected.push(children[j])
    }
  }

  return affected
}

function waitForElement(callback, timeout = 15000) {
  const start = Date.now();

  let interval = setInterval(() => {
    const els = document.querySelectorAll(reblogButtonSelectorInDashboard);
    const outsideEls = document.querySelectorAll(reblogButtonSelectorOutsideOfDashboard)
    if (els.length) {
      clearInterval(interval);
      callback('dashboard');
    } else if (outsideEls.length) {
      clearInterval(interval);
      callback('outside');
    } else if (Date.now() - start > timeout) {
      clearInterval(interval);
    }
  }, 500);
}


function setListenersOnThisPage(){
  removeListenersOnThisPage()
  affectedElements = []

  function callback(location){
    if (location === 'dashboard'){
      affectedElements = getAffectedElementsInDash()
    } else {
      affectedElements = getAffectedElementsOutside()
    }
    for(let j = 0; j< affectedElements.length; j++) {
      preventLongPressMenuDash(affectedElements[j])
    }
  }

  waitForElement(callback)

}

function removeListenersOnThisPage(){
  for(let j = 0; j< affectedElements.length; j++) {
    removeListeners(affectedElements[j])
  }
}

export const main = async function () {
  console.log('main')
setListenersOnThisPage()
let currentUrl = location.href;

setInterval(() => {
  if (location.href !== currentUrl) {
    currentUrl = location.href;
    setListenersOnThisPage();
  }
}, 500)
};

export const clean = async function () {
removeListenersOnThisPage()
};

export const stylesheet = true;
