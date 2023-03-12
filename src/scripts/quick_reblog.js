import { timelineObject } from '../util/react_props.js';
import { apiFetch } from '../util/tumblr_helpers.js';
import { blog_uuid } from '../util/blog_uuid.js';

const postSelectorDashboard = '[tabindex="-1"][data-id]';
const postSelectorOutside = 'section#posts div.container div.main article'
const reblogButtonSelectorInDashboard = `
${postSelectorDashboard} footer a[href*="/reblog/"],
${postSelectorDashboard} footer button[aria-label="Reblog"]:not([role])
`;

const reblogButtonSelectorOutsideOfDashboard = `div.control.reblog-control`;

const reblogOnLongClick = async ({ currentTarget }, location) => {
  console.log('reblog')
  console.log(location)

  const isDashboard = location === 'dashboard'
  const currentReblogButton = isDashboard ? currentTarget.parentElement.parentElement.parentElement.parentElement.parentElement : currentTarget;

  const postElement = isDashboard ? currentTarget.closest(postSelectorDashboard) : currentTarget.closest(postSelectorOutside);
  const postID = postElement.dataset.id;
  const state = 'published'

  const blog = blog_uuid
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

function preventLongPressMenu(node, location) {
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


function setListenersOnThisPage(location){
  removeListenersOnThisPage()
  affectedElements = []

  function callback(){
    if (location === 'dashboard'){
      affectedElements = getAffectedElementsInDash()
    } else {
      affectedElements = getAffectedElementsOutside()
    }
    for(let j = 0; j< affectedElements.length; j++) {
      preventLongPressMenu(affectedElements[j], location)
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
let currentUrl = location.href;
if (currentUrl.includes('dashboard')){
  setListenersOnThisPage('dashboard');

} else {
  setListenersOnThisPage('outside');

}

setInterval(() => {
  if (location.href !== currentUrl) {
    currentUrl = location.href;
    if (currentUrl.includes('dashboard')){
      setListenersOnThisPage('dashboard');

    } else {
      setListenersOnThisPage('outside');

    }
  }
}, 500)
};

export const clean = async function () {
removeListenersOnThisPage()
};

export const stylesheet = true;
