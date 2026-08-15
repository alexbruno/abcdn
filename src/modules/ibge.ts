import { getDataJSON, putObject } from './storage';

const IBGE = 'ibge';
const API = 'https://servicodados.ibge.gov.br/api';

export async function getLocals(path: string, key: string) {
  const url = `${API}/v1/localidades/${path}`;
  console.log(url, key);
  return getDataJSON(key, url);
}

export async function setLocals(env: Env, path: string, key: string) {
  console.log(path, key);
  const source = await getLocals(path, key);
  return putObject(env, key, source);
}

export async function setRegionsList(env: Env) {
  const path = 'regioes?orderBy=nome';
  const target = `${IBGE}/regioes.json`;
  console.log(path, target);
  return setLocals(env, path, target);
}

export async function setRegionData(env: Env, key: string) {
  const path = `regioes/${key}`;
  const target = `${IBGE}/regioes/${key}.json`;
  console.log(path, target);
  return setLocals(env, path, target);
}

export async function setCitiesList(env: Env, path: string) {
  const target = `${IBGE}/cities.json`;
  const source = await getLocals(path, target);

  source.data = source.data.map(mapCity);

  return putObject(env, target, source);
}

export async function setCity(env: Env, key: string) {
  const target = `${IBGE}/cities/${key}.json`;
  const source = await getLocals(`municipios/${key}`, target);

  source.data = mapCity(source.data);

  return putObject(env, target, source);
}

export async function getDistrictsList(env: Env, path: string, key: string) {
  const source = await getLocals(path, key);

  source.data = source.data.map(mapDistrict);

  return putObject(env, key, source);
}

// export async function setDistrict(id: string, cache = true) {
//   const source = await setLocals(
//     `distritos/${id}`,
//     `ibge/districts/${id}/data/view`,
//     false,
//   );

//   if (!source.cache) source.data = mapDistrict(source.data);

//   return cache ? setDataCache(source) : source;
// }

// export async function getCapitals(cache = true) {
//   const source = await setLocals(
//     'municipios?orderBy=nome',
//     'ibge/capitals/list',
//     false,
//   );

//   if (!source.cache)
//     source.data = source.data.filter(filterCapital).map(mapCity);

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
  return caps.some(
    (cap) =>
      cap.nome === city.nome &&
      cap.uf === city['regiao-imediata']['regiao-intermediaria'].UF.sigla,
  );
}

export async function setGeoData(env: Env, level: string, key: string) {
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
