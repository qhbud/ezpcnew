const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const AFFILIATE_DISCLOSURE = 'As an Amazon Associate EZPC earns from qualifying purchases.';
const PAGE_CHECKS = [
    {
        path: '/privacy.html',
        title: 'Privacy Policy | EZPC World',
        h1: 'Privacy Policy'
    },
    {
        path: '/terms.html',
        title: 'Terms of Use | EZPC World',
        h1: 'Terms of Use'
    },
    {
        path: '/about.html',
        title: 'About EZPC | EZPC World',
        h1: 'About EZPC'
    }
];

const results = [];

function record(name, ok, detail = '') {
    results.push({ name, ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : `: ${detail}`}`);
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function fetchText(path) {
    const response = await fetch(`${BASE_URL}${path}`);
    const body = await response.text();
    return { response, body };
}

(async () => {
    try {
        for (const pageCheck of PAGE_CHECKS) {
            const { response, body } = await fetchText(pageCheck.path);
            record(`${pageCheck.path} HTTP 200`, response.status === 200, `status=${response.status}`);
            record(`${pageCheck.path} body length > 500`, body.length > 500, `length=${body.length}`);
            record(
                `${pageCheck.path} title`,
                body.includes(`<title>${pageCheck.title}</title>`),
                `expected=${pageCheck.title}`
            );
            record(
                `${pageCheck.path} h1`,
                new RegExp(`<h1[^>]*>\\s*${escapeRegExp(pageCheck.h1)}\\s*</h1>`, 'i').test(body),
                `expected=${pageCheck.h1}`
            );
            record(
                `${pageCheck.path} affiliate disclosure`,
                body.includes(AFFILIATE_DISCLOSURE),
                `expected=${AFFILIATE_DISCLOSURE}`
            );
        }

        const { response, body: index } = await fetchText('/');
        record('/ HTTP 200', response.status === 200, `status=${response.status}`);

        for (const href of ['/privacy.html', '/terms.html', '/about.html']) {
            record(`index footer link ${href}`, index.includes(`href="${href}"`), `href=${href}`);
        }

        record(
            'index affiliate disclosure',
            index.includes(AFFILIATE_DISCLOSURE),
            `expected=${AFFILIATE_DISCLOSURE}`
        );

        const head = index.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] || '';
        record(
            'Plausible analytics script in head',
            /<script\b[^>]*\bdefer\b[^>]*\bdata-domain="ezpc\.world"[^>]*\bsrc="https:\/\/plausible\.io\/js\/script\.js"[^>]*><\/script>/i.test(head),
            'expected data-domain=ezpc.world and plausible.io/js/script.js'
        );
        record(
            'analytics Quinn placeholder comment',
            /Quinn must confirm data-domain="ezpc\.world" or swap providers before launch/i.test(head),
            'expected launch-edit comment'
        );
        record(
            'no analytics secret or Sentry/GA identifier',
            !/(sentry|dsn\s*=|G-[A-Z0-9]{6,}|UA-\d+-\d+)/i.test(head),
            'unexpected analytics/error identifier in head'
        );
    } catch (error) {
        record('trust gate setup', false, error.stack || error.message || String(error));
    }

    const failures = results.filter(result => !result.ok);
    console.log(`RESULTS: ${results.length - failures.length} passed, ${failures.length} failed`);
    process.exitCode = failures.length === 0 ? 0 : 1;
})();
