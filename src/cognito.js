const axios = require('axios').default;
const axiosCookieJarSupport = require('axios-cookiejar-support').default;
const tough = require('tough-cookie');
const { Cookie } = require('tough-cookie');
const qs = require('qs');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth')

puppeteer.use(StealthPlugin())
axiosCookieJarSupport(axios);

const cognitoBase = `https://www.cognitoforms.com`;

module.exports.downloadLink = (id, contentType) =>
  `${cognitoBase}/forms/admin/file?id=${id}&ct=${contentType}`;

module.exports.foreign = (name, thisSheet, referenceSheet, idCol) => {
  const foreignGroups = new Map();
  referenceSheet.forEach((row) => {
    const id = row[idCol];
    const collection = foreignGroups.get(id);
    if (!collection) {
      foreignGroups.set(id, [row]);
    } else {
      collection.push(row);
    }
  });

  return thisSheet.map((row) => ({
    ...row,
    [name]: foreignGroups.get(row[idCol]) || [],
  }));
}

let jar;
const withLogin = async () => {
  if (!jar) {
    jar = new tough.CookieJar();

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(cognitoBase);
    await page.goto(`${cognitoBase}/login`);
    await page.type('#email-address', process.env.COGNITO_USERNAME);
    await page.type('#password', process.env.COGNITO_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    (await page.cookies()).forEach(({ name, value }) => {
      jar.setCookieSync(`${name}=${value}`, cognitoBase, {});
    });

    await browser.close();
  }

  const axiosWithCookies = async ({ headers, ...options }) => axios({
    jar,
    withCredentials: true,
    headers: {
      'User-agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:68.0) Gecko/20100101 Firefox/68.0',
      ...headers,
    },
    ...options
  });

  return axiosWithCookies;
}

module.exports.getCsv = async (id) => {
  console.log(`|- Getting ${id}`);
  const cognitoUrlExport = `${cognitoBase}/forms/admin/exportentries`;
  const exportPayload = {
    viewModel: {
      AllFields: "true",
      ViewId: `${id}-1`,
    },
  };

  return (await withLogin())({
    url: cognitoUrlExport,
    method: 'POST',
    data: qs.stringify(exportPayload),
    responseType: 'arraybuffer',
  });
}

module.exports.getAttachment = async (id, contentType) => {
  const url = module.exports.downloadLink(id, contentType);
  return (await withLogin())({ url, responseType: 'arraybuffer' });
}
