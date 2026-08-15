import { getDataJSON, putObject } from './storage';
import { CacheData } from './types';

const IBGE = 'ibge';
const API = 'https://servicodados.ibge.gov.br/api';

export async function getLocals(path: string, key: string) {
  const url = `${API}/v1/localidades/${path}`;
  return getDataJSON(key, url);
}

export async function setLocals(
  env: Cloudflare.Env,
  path: string,
  key: string,
) {
  const source = await getLocals(path, key);
  return putObject(env, key, source);
}

export async function setRegionsList(env: Cloudflare.Env) {
  const path = 'regioes?orderBy=nome';
  const target = `${IBGE}/regioes.json`;
  return setLocals(env, path, target);
}

export async function setRegionData(env: Cloudflare.Env, key: string) {
  const path = `regioes/${key}`;
  const target = `${IBGE}/regioes/${key}.json`;

  await setGeoData(env, 'regioes', key);
  await setRegionStates(env, key);

  return setLocals(env, path, target);
}

export async function setRegionStates(env: Cloudflare.Env, key: string) {
  const path = `regioes/${key}/estados?orderBy=nome`;
  const target = `${IBGE}/regioes/${key}/estados.json`;
  return setLocals(env, path, target);
}

export async function setStatesList(env: Cloudflare.Env) {
  const path = 'estados?orderBy=nome';
  const target = `${IBGE}/estados.json`;
  return setLocals(env, path, target);
}

export async function setStateData(env: Cloudflare.Env, key: string) {
  const path = `estados/${key}`;
  const target = `${IBGE}/estados/${key}.json`;

  await env.QUEUE.send({
    key: 'uf',
    value: key,
  });

  return setLocals(env, path, target);
}

export async function setCities(env: Cloudflare.Env) {
  const path = 'municipios?orderBy=nome';
  const source = await getLocals(path, `${IBGE}/cidades.json`);
  const cities = source.data.map(mapCity);
  const capitals = cities.filter(filterCapital);

  await putObject(env, `${IBGE}/capitais.json`, capitals);

  const grouped = cities.reduce((result: any, city: any) => {
    const uf = city.uf.sigla;

    if (!result[uf]) result[uf] = [];

    result[uf].push(city);

    return result;
  }, {} as any);

  for (const uf of Object.keys(grouped)) {
    const target = `${IBGE}/estados/${uf}/cidades.json`;
    const cache: CacheData = {
      key: target,
      data: grouped[uf],
      update: new Date().toJSON(),
    };

    await putObject(env, target, cache);
  }

  for (const city of cities) {
    await env.QUEUE.send({
      key: 'city',
      value: city,
    });
  }
}

export async function setCity(env: Cloudflare.Env, city: any) {
  const target = `${IBGE}/cidades/${city.id}.json`;
  const cache: CacheData = {
    key: target,
    data: city,
    update: new Date().toJSON(),
  };

  return putObject(env, target, cache);
}

// export async function getDistrictsList(
//   env: Cloudflare.Env,
//   path: string,
//   key: string,
// ) {
//   const source = await getLocals(path, key);

//   source.data = source.data.map(mapDistrict);

//   return putObject(env, key, source);
// }

// export async function setDistrict(id: string, cache = true) {
//   const source = await setLocals(
//     `distritos/${id}`,
//     `ibge/districts/${id}/data/view`,
//     false,
//   );

//   if (!source.cache) source.data = mapDistrict(source.data);

//   return cache ? setDataCache(source) : source;
// }

// export async function getCityStats(id: string) {
//   const codes = {
//     pop: 29171,
//     job: 60036,
//     salary: 29765,
//     idh: 30255,
//   };
//   const data: any = {
//     id,
//     pop: {},
//     job: {},
//     salary: {},
//     idh: {},
//   };
//   const stats = Object.entries(codes).map(async ([key, code]) => {
//     const source = await getDataJSON(
//       `${API}/v1/pesquisas/indicadores/${code}/resultados/${id}`,
//       `ibge/cities/${id}/stats/${key}`,
//       1,
//       'months',
//     );

//     if (!source.cache) source.data = source.data[0].res[0].res;

//     const year = Object.keys(source.data).sort().pop() as string;
//     data[key] = { year: Number(year), value: Number(source.data[year]) };

//     return setDataCache(source);
//   });

//   await Promise.all(stats);

//   return data;
// }

// helpers
function mapCity(city: any) {
  try {
    city.uf = city['regiao-imediata']['regiao-intermediaria'].UF;
    delete city['regiao-imediata']['regiao-intermediaria'].UF;
    delete city.microrregiao?.mesorregiao?.UF;
    return city;
  } catch (error) {
    console.log('error', error);
    throw error;
  }
}

function mapDistrict(district: any) {
  district.municipio = mapCity(district.municipio);
  district.uf = district.municipio.uf;
  delete district.municipio.uf;
  return district;
}

function filterCapital(city: any) {
  const caps = [
    { uf: 'AC', nome: 'Rio Branco' },
    { uf: 'AL', nome: 'Maceió' },
    { uf: 'AM', nome: 'Manaus' },
    { uf: 'AP', nome: 'Macapá' },
    { uf: 'BA', nome: 'Salvador' },
    { uf: 'CE', nome: 'Fortaleza' },
    { uf: 'DF', nome: 'Brasília' },
    { uf: 'ES', nome: 'Vitória' },
    { uf: 'GO', nome: 'Goiânia' },
    { uf: 'MA', nome: 'São Luís' },
    { uf: 'MG', nome: 'Belo Horizonte' },
    { uf: 'MS', nome: 'Campo Grande' },
    { uf: 'MT', nome: 'Cuiabá' },
    { uf: 'PA', nome: 'Belém' },
    { uf: 'PB', nome: 'João Pessoa' },
    { uf: 'PE', nome: 'Recife' },
    { uf: 'PI', nome: 'Teresina' },
    { uf: 'PR', nome: 'Curitiba' },
    { uf: 'RJ', nome: 'Rio de Janeiro' },
    { uf: 'RN', nome: 'Natal' },
    { uf: 'RO', nome: 'Porto Velho' },
    { uf: 'RR', nome: 'Boa Vista' },
    { uf: 'RS', nome: 'Porto Alegre' },
    { uf: 'SC', nome: 'Florianópolis' },
    { uf: 'SE', nome: 'Aracaju' },
    { uf: 'SP', nome: 'São Paulo' },
    { uf: 'TO', nome: 'Palmas' },
  ];
  return caps.some((cap) => cap.uf === city.uf.sigla && cap.nome === city.nome);
}

export async function setGeoData(
  env: Cloudflare.Env,
  level: string,
  key: string,
) {
  const target = `${IBGE}/geo/${level}/${key}.json`;
  const endpoint = `${API}/v4/malhas/${level}/${key}`;
  const source = await getDataJSON(target, `${endpoint}/metadados`);

  source.meta = {
    svg: endpoint,
    geoJSON: `${endpoint}?formato=application/vnd.geo+json`,
  };

  if (Array.isArray(source.data)) source.data = source.data[0];

  return putObject(env, target, source);
}
