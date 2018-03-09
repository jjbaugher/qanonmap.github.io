let debug = window.location.hostname === 'localhost';

const pipe = (...funcs) => i => funcs.reduce((p, c) => c(p), i);
const create = (item, ...funcs) => funcs.reduce((p, c) => c(p), item);

const getJson = url => fetch(url).then(response => response.json());
const getLocalJson = filename => fetch(`data/json/${filename}.json`, {credentials: 'same-origin'}).then(r => r.json());
const getHostname = urlString => new URL(urlString).hostname;
const postJson = (url, object) => fetch(url, {
    method: "post",
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(object)
});

const forAll = (items, htmlCallback) => items && items instanceof Array
    ? items
        .map(htmlCallback)
        .join('')
    : '';
const ifExists = (item, htmlCallback) => item
    ? htmlCallback(item)
    : '';

const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec'
];
const xx = x => (x < 10
    ? '0'
    : '') + x;
const formatDate = date => `${months[date.getMonth()]} ${date.getDate()} ${date.getFullYear()}`;
const formatTime = date => `${xx(date.getHours())}:${xx(date.getMinutes())}:${xx(date.getSeconds())}`;

const tag = (name, attributes) => {
    const element = document.createElement(name);
    if (attributes) {
        for (const attribute of Object.keys(attributes)) {
            element.setAttribute(attribute, attributes[attribute]);
        }
    }
    return element;
};
tag.fromString = string => {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = string;
    return wrapper.firstElementChild;
};
const appendTo = container => element => container.appendChild(element);
function bindRadios(name, form) {
    const radios = form.querySelectorAll(`[name=${name}]`);
    const panels = Array
        .from(radios)
        .map(radio => form.querySelector(`#details_${radio.value}`));
    for (const radio of radios) {
        radio.onchange = () => {
            panels.forEach(p => {
                const hide = p.id !== `details_${radio.value}`;
                p.hidden = hide;
                p
                    .querySelectorAll('input,textarea')
                    .forEach(i => i.disabled = hide);
            });
        };
    }
    radios
        .item(0)
        .checked = true;
    radios
        .item(0)
        .onchange();
}
function Submission(form) {
    const inputs = Array
        .from(form.elements)
        .filter(el => el.validity.valid && el.value !== '' && (el.type !== 'radio' || el.checked));
    const submission = {};
    for (const input of inputs) {
        submission[input.name] = input.value;
    }
    return submission;
}
const onSubmit = form_event => form => {
    form.onsubmit = form_event(form);
    return form;
};
const getParams = query => {
    if (!query) {
        return {};
    }

    return (/^[?#]/.test(query)
        ? query.slice(1)
        : query)
        .split('&')
        .reduce((params, param) => {
            let [key,
                value] = param.split('=');
            params[key] = value
                ? decodeURIComponent(value
                // .replace(/\+/g, ' ')
                )
                : '';
            return params;
        }, {});
};
const setParams = params => {
    if (Object.keys(params).length) {
        const value = Object
            .keys(params)
            .map(k => `${k}=${encodeURIComponent(params[k]
            // .replace(/ /g, '+')
            )}`)
            .join('&');

        history.replaceState({}, null, `?${value}`);
    } else {
        history.replaceState({}, null, `?`);
    }
};

let news = [];
function main() {
    Promise
        .all([getLocalJson('news')])
        .then(values => {
            news = values[0];
            news.sort((a, b) => b.date - a.date);
            initNews(news);
            initSearch(news, document.querySelector('input[type=search]'));
        });
}

function initSearch(items, searchElement) {
    searchElement.oninput = () => {
        const terms = searchElement
            .value
            .toLowerCase()
            .split(' ');

        const keywordInText = (term, text) => text
            .toLowerCase()
            .includes(term);
        const itemContains = item => term => (item.headline && keywordInText(term, item.headline)) || (item.description && keywordInText(term, item.description)) || keywordInText(term, item.url);

        const ids = items
            .filter(item => terms.every(itemContains(item)))
            .map(p => p.id);

        applyFilter(ids);

        if (value === '') 
            setParams({});
        else 
            setParams({q: value});
        }
    ;
    const result = {};
    for (const item of items) {
        const hostname = getHostname(item.url);
        if (!result[hostname]) 
            result[hostname] = new Set();
        result[hostname].add(item.id);
    }
    const resultList = Object
        .keys(result)
        .map(k => ({line: k, ids: result[k]}))
        .filter(a => a.ids.size > 2);

    resultList.sort((a, b) => b.ids.size - a.ids.size);
    const datalist = document.querySelector('#hints');
    datalist.innerHTML = resultList
        .map(i => `<option label="${i.ids.size}">${i.line}</option>`)
        .join('\n');

    const query = getParams(location.search);
    if ('q' in query) {
        searchElement.value = query.q;
        searchElement.oninput();
    }
}

function initNews(newsItems) {
    const container = document.querySelector('main');
    let lastDate = new Date(newsItems[0].date);
    let newsContainer = tag('section');
    container.appendChild(tag.fromString(html.date(lastDate)));
    for (const item of newsItems) {
        const newsDate = new Date(item.date);
        if (lastDate.getTime() !== newsDate.getTime()) {
            lastDate = newsDate;
            container.appendChild(newsContainer);
            container.appendChild(tag.fromString(html.date(newsDate)));
            newsContainer = tag('section');
        }
        const element = tag.fromString(html.news(item));
        element.item = item;
        newsContainer.appendChild(element);
    }
    container.appendChild(newsContainer);
}

function applyFilter(ids) {
    let count = 0;
    for (const element of Array.from(document.querySelectorAll('article'))) {
        if (ids.includes(element.item.id)) {
            element.hidden = false;
            count++;
        } else {
            element.hidden = true;
        }
    }
    for (const h3 of Array.from(document.querySelectorAll('.sticky'))) {
        const section = h3.nextElementSibling;
        h3.hidden = Array
            .from(section.children)
            .every(c => c.hidden);
    }
    document
        .querySelector('#count')
        .textContent = `${count}`;
}

const html = {
    img: (src) => {
        if (!src) 
            return '';
        return `<img src="${src}" class="contain" width="100" height="100">`;
    },
    date: item => {
        return `
        <h3 class="center sticky"><time datetime="${item.toISOString()}">${formatDate(item)}</time></h3>
        `;
    },
    news: item => {
        return `
        <article>
        ${ifExists(debug, x => `
        <button onclick="this.parentElement.hidden = true">✖</button>`)}
        <a href="${item.url}" target="_blank" class="row">
          <div>${ifExists(item.imageUrl, html.img)}</div>
          <div class="stretch">
            <h2>${item.headline}</h2>
            ${ifExists(item.description, x => `
            <p class="text">${x}</p>`)}
          </div>
          </a>
        <small>${getHostname(item.url)}</small>
        </article>`;
    }
};

document.addEventListener('DOMContentLoaded', main, false);