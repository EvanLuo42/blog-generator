const swig = require('swig');
const yaml = require('js-yaml');
const fs = require("fs");
const marked = require('marked');
const copyDir = require('node-copydir');
const highlight = require('highlight.js');
const renderer = new marked.Renderer();
const Feed = require('feed').Feed;

function sanitize(str) {
    return str.replace(/&<"/g, function (m) {
        if (m === "&") return "&amp;"
        if (m === "<") return "&lt;"
        return "&quot;"
    })
}

renderer.image = function (src, title, alt) {
    const exec = /=\s*(\d*(?:px|em|ex|ch|rem|vw|vh|vmin|vmax|%))\s*,*\s*(\d*(?:px|em|ex|ch|rem|vw|vh|vmin|vmax|%))*\s*$/.exec(title);
    let res = '<img src="' + sanitize(src) + '" alt="' + sanitize(alt)
    if (exec && exec[1]) res += '" height="' + exec[1]
    if (exec && exec[2]) res += '" width="' + exec[2]
    return res + '">'
}

marked.setOptions({
    renderer: renderer,
    gfm: true,
    pedantic: false,
    sanitize: false,
    tables: true,
    breaks: false,
    smartLists: true,
    smartypants: false,
    highlight: function (code, lang) {
        return highlight.default.highlight(code, {
            language: lang,
        }).value;
    }
});


let config = yaml.load(fs.readFileSync("config.yml", "utf8"));

let feed = new Feed({
    title: config.site.name,
    description: config.site.description,
    link: config.site.domain,
    author: {
        name: config.site.author.name,
        email: config.site.author.email,
        link: config.site.author.link
    }
});

feed.addCategory("Technology");

copyDir("templates/img", "gen/img", () => {})
copyDir("templates/css", "gen/css", () => {})

let postsPreview = []

fs.readdirSync("source").forEach((path) => {
    let info = yaml.load(fs.readFileSync("source/" + path + "/info.yml", "utf8"));
    postsPreview.push({
        title: info.article.title,
        link: info.article.link,
        date: info.article.date.toUTCString(),
    })
    if (!fs.existsSync("gen/" + info.article.link)) {
        fs.mkdirSync("gen/" + info.article.link)
    }
    let template = swig.compileFile("templates/post.html");
    fs.writeFileSync("gen/" + info.article.link + "/index.html", template({
        description: config.site.description,
        site_name: config.site.name,
        site_url: config.site.domain,
        twitter_username: config.twitter_username,
        github_username: config.github_username,
        title: info.article.title,
        date: new Date(info.article.date).toUTCString(),
        content: marked.parse(fs.readFileSync("source/" + path + "/" + info.article.title + ".md", "utf8"))
    }))
    copyDir("templates/css", "gen/" + info.article.link + "/css", () => {})
    copyDir("source/" + path + "/assets", "gen/" + info.article.link + "/assets", () => {})
    feed.addItem({
        title: info.article.title,
        link: config.site.domain + "/" + info.article.link,
        date: info.article.date,
    })
})

let indexTemplate = swig.compileFile("templates/index.html")
let indexHtml = indexTemplate({
    description: config.site.description,
    site_name: config.site.name,
    site_url: config.site.domain,
    twitter_username: config.twitter_username,
    github_username: config.github_username,
    items: postsPreview
})

fs.writeFileSync("gen/index.html", indexHtml)
fs.writeFileSync("gen/rss.xml", feed.rss2())