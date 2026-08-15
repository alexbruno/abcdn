import { Hono } from 'hono';
import {
  setCitiesList,
  setCity,
  setGeoData,
  setRegionData,
  setRegionsList,
  setStateData,
  setStatesList,
} from './modules/ibge';

const app = new Hono();

app.get('/', (ctx) => {
  return ctx.text('Hello Hono!');
});

export default {
  fetch: app.fetch,

  async scheduled(_ctrl, env, _ctx) {
    try {
      const regions = await setRegionsList(env);

      for (const region of regions.data) await setRegionData(env, region.sigla);

      const states = await setStatesList(env);

      for (const state of states.data) await setStateData(env, state.sigla);
    } catch (error) {
      console.log('error', error);
    }
  },

  async queue(batch, env, _ctx) {
    for (const message of batch.messages) {
      const { key, value } = JSON.parse(message.body as string);

      switch (key) {
        case 'uf':
          console.log('uf', value);
          await setGeoData(env, 'ufs', value);
          await setCitiesList(env, value);
          break;

        case 'city':
          console.log('city', value);
          await setCity(env, value);
          break;

        default:
          console.log('No queue action for:', key, value);
      }
    }
  },
} satisfies ExportedHandler<Cloudflare.Env>;
