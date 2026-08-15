import { CacheData } from './types';

export async function getObject(env: Env, path: string): Promise<any> {
  console.log('getObject', path);
  const object = await env.BUCKET.get(path);

  if (!object) return null;

  return object.json();
}

export async function putObject(
  env: Env,
  key: string,
  data: any,
): Promise<CacheData> {
  console.log(key, data);
  await env.BUCKET.put(key, JSON.stringify(data));

  return getObject(env, key);
}

export async function deleteObject(env: Env, path: string): Promise<void> {
  await env.BUCKET.delete(path);
}

export async function getDataJSON(
  key: string,
  url: string,
): Promise<CacheData> {
  const request = await fetch(url);
  const data = await request.json();
  const result = {
    key,
    data,
    update: new Date().toJSON(),
  };

  return result;
}
