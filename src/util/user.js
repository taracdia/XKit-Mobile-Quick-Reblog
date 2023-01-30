import { apiFetch } from './tumblr_helpers.js';

const fetchedUserInfo = await apiFetch('/v2/user/info').catch(() => ({ response: {} }));

/**
 * {object?} userInfo - The contents of the /v2/user/info API endpoint
 */
export const userInfo = fetchedUserInfo.response.user;

/**
 * {object[]} userBlogs - An array of blog objects the current user has post access to
 */
export const userBlogs = userInfo?.blogs ?? [];