const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const PAGES = require('./pages.js');
const quizTranslations = require('../html/_data/quizTranslations.js');
const { localizeQuiz } = require('../lib/localize-quiz.js');

const quizDir = path.join(__dirname, '../html/_data/quizzes');
const quizzes = Object.fromEntries(fs.readdirSync(quizDir)
    .filter(file => file.endsWith('.js'))
    .map(file => [path.basename(file, '.js'), require(path.join(quizDir, file))]));

const SITE = 'https://controlsfreak.dev';

function koreanPath(url) {
    return url === '/' ? '/ko/' : `/ko${url}`;
}

function cleanPath(url) {
    return url.replace(/\.html$/, '');
}

function watchErrors(page) {
    const errors = [];
    page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
    page.on('console', message => {
        if (message.type() === 'error') errors.push(`console: ${message.text()}`);
    });
    return errors;
}

test('English and Korean canonical routes form an exact sitemap bijection', () => {
    const sitemap = fs.readFileSync('_site/sitemap.xml', 'utf8');
    const actual = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
        .map(match => match[1])
        .sort();
    const expected = PAGES.flatMap(({ url }) => [
        `${SITE}${cleanPath(url)}`,
        `${SITE}${cleanPath(koreanPath(url))}`,
    ]).sort();

    expect(actual).toEqual(expected);
    expect(new Set(actual).size, 'canonical URLs are unique').toBe(actual.length);
});

test('Korean quiz overlays localize every internal prose link', () => {
    for (const [slug, questions] of Object.entries(quizzes)) {
        const localized = localizeQuiz(questions, 'ko', slug, quizTranslations);
        for (const question of localized) {
            const fragments = [question.prompt, question.explain, question.snippet]
                .concat((question.choices || []).map(choice => choice.text))
                .filter(Boolean);
            const hrefs = fragments.flatMap(fragment =>
                [...String(fragment).matchAll(/href\s*=\s*(["'])(.*?)\1/gi)].map(match => match[2]));
            expect(hrefs.filter(href => href.startsWith('/')).every(href => href.startsWith('/ko/')),
                `${slug}/${question.id} prose links`).toBe(true);
            if (question.learnMore) {
                expect(question.learnMore.href, `${slug}/${question.id} learn-more link`).toMatch(/^\/ko\//);
            }
        }
    }
});

test('Korean next-quiz links use labels without a duplicated title suffix', () => {
    const quizPages = PAGES.filter(({ url }) =>
        url.startsWith('/practice/') && url !== '/practice/');

    for (const { name, url } of quizPages) {
        const outputPath = path.join(__dirname, '..', '_site', koreanPath(url));
        const html = fs.readFileSync(outputPath, 'utf8');
        const match = html.match(/\bnext:\s*(\{[^\r\n]*\}|null),/);

        expect(match, `${name} renders a next-quiz configuration`).not.toBeNull();
        if (match[1] === 'null') continue;

        const next = JSON.parse(match[1]);
        expect(next.href, `${name} next quiz stays in Korean`).toMatch(/^\/ko\/practice\//);
        expect(next.label, `${name} next quiz omits the localized title suffix`).not.toMatch(/\s퀴즈$/);
    }
});

for (const { name, url } of PAGES) {
    const localized = koreanPath(url);

    test(`Korean page mirrors ${name}`, async ({ page }) => {
        if (url === '/contact.html') {
            await page.route('https://challenges.cloudflare.com/**', route => route.fulfill({
                status: 200,
                contentType: 'application/javascript',
                body: '',
            }));
        }
        const errors = watchErrors(page);
        const response = await page.goto(localized);
        expect(response.status(), localized).toBe(200);
        await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
        await expect(page).toHaveTitle(/controlsfreak\.dev/);
        await expect(page.locator('main')).toContainText(/[가-힣]/);

        const englishClean = `${SITE}${cleanPath(url)}`;
        const koreanClean = `${SITE}${cleanPath(localized)}`;
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', koreanClean);
        await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute('href', englishClean);
        await expect(page.locator('link[rel="alternate"][hreflang="ko"]')).toHaveAttribute('href', koreanClean);
        await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute('href', englishClean);
        await expect(page.locator('.language-switch a[hreflang="en"]')).toHaveAttribute('href', url);
        await expect(page.locator('.language-switch a[hreflang="ko"]')).toHaveAttribute('aria-current', 'page');
        await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'ko_KR');
        await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', `${SITE}/assets/og-image-ko.png`);

        expect(errors, `${localized} should log no page or console errors`).toEqual([]);
    });
}

test('Korean search stays inside the Korean index and localizes runtime states', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/ko/');
    await page.keyboard.press('/');

    await expect(page.locator('#palette')).toBeVisible();
    await expect(page.locator('#palette-status')).toContainText('인기 페이지');
    await page.fill('#palette-input', 'BACnet');
    await expect(page.locator('.palette-result').first()).toBeVisible();
    const urls = await page.locator('.palette-result').evaluateAll(items =>
        items.map(item => item.dataset.url));
    expect(urls.length).toBeGreaterThan(0);
    expect(urls.every(url => url.startsWith('/ko/'))).toBe(true);
    await expect(page.locator('.palette-result-tag').first()).toContainText(/도구|학습|시뮬레이터|퀴즈|페이지/);

    expect(errors, 'Korean search should log no page or console errors').toEqual([]);
});

test('shared Korean runtime copy survives state updates', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/ko/');

    await expect(page.locator('#hero-readout')).toContainText('급기');
    await page.click('.theme-btn[data-theme-set="light"]');
    await expect(page.locator('.theme-btn[data-theme-set="light"]')).toHaveAttribute('aria-pressed', 'true');
    await page.click('.units-btn[data-units="metric"]');
    await expect(page.locator('.units-btn[data-units="metric"]')).toHaveAttribute('aria-pressed', 'true');

    expect(errors, 'shared Korean runtime states should log no errors').toEqual([]);
});

test('contact errors preserve the English server detail without leaking it into Korean', async ({ page }) => {
    await page.route('https://challenges.cloudflare.com/**', route => route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: '',
    }));
    await page.route('**/api/contact', route => route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
            ok: false,
            code: 'UNKNOWN',
            error: 'Legacy English detail.',
        }),
    }));

    const submit = async (url) => {
        await page.goto(url);
        await page.fill('#contact-email', 'yena@example.com');
        await page.fill('#contact-message', 'Localization test');
        await page.click('#contact-form button[type="submit"]');
    };

    await submit('/contact.html');
    await expect(page.locator('#contact-result-value')).toHaveText('Legacy English detail.');

    await submit('/ko/contact.html');
    await expect(page.locator('#contact-result-value')).toHaveText('문제가 발생했습니다.');
    await expect(page.locator('#contact-result-value')).not.toContainText('Legacy English detail.');
});

test('Korean psychrometric chart localizes computed and validation states', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/ko/tools/psychrometric-chart.html');

    await expect(page.locator('#psy-msg')).toContainText('해수면');
    await expect(page.locator('.psy-pill[data-step="hc"]')).toHaveAttribute('aria-label', /단계 꺼짐/);
    await page.click('.psy-pill[data-step="ra"]');
    await page.selectOption('#ra-mode', 'wb');
    await page.fill('#ra-tdb', '70');
    await page.fill('#ra-second', '80');
    await expect(page.locator('#ro-wb')).toHaveText('—');
    await expect(page.locator('#psy-msg')).toContainText('습구온도는 건구온도보다 높을 수 없습니다');
    await page.click('.units-btn[data-units="metric"]');
    await expect(page.locator('label[for="ra-tdb"]')).toContainText('°C');

    expect(errors, 'Korean psychrometric states should log no errors').toEqual([]);
});

test('Korean FCU workbench localizes live faults, overrides, and parameter errors', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/ko/simulators/ddc-workbench-fcu.html');
    await page.waitForFunction(() =>
        document.getElementById('fcu-verdict').textContent.trim().length > 0);

    await expect(page.locator('#ddcw-io')).toContainText('냉방 1단');
    await page.click('[data-preset="lowcharge"]');
    await expect(page.locator('#fcu-verdict')).toContainText('냉매 부족은 가능한 원인 중 하나');

    const coolingSetpoint = page.locator('#fcu-p-cool-sp');
    await coolingSetpoint.fill('10');
    await coolingSetpoint.press('Enter');
    await expect(page.locator('#fcu-params-hint')).toContainText('허용 범위');

    await page.locator('#fcu-null-fan').uncheck();
    await expect(page.locator('#ddcw-offprog-list')).toContainText('슬롯 8(Manual Operator)에서 지령 중');
    await expect(page.locator('#ddcw-unit-sel-lbl')).toHaveText('장치');
    await expect(page.locator('.ddcw-unit-link[href="/ko/simulators/ddc-workbench.html"]')).toHaveText('AHU');

    expect(errors, 'Korean FCU workbench should log no errors').toEqual([]);
});

test('Korean AHU workbench localizes faults, overrides, and field-device states', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/ko/simulators/ddc-workbench.html');
    await page.waitForFunction(() =>
        document.getElementById('ahu-verdict').textContent.trim().length > 0);

    await expect(page.locator('#ddcw-io')).toContainText('존 온도');
    await page.click('[data-preset="lowcharge"]');
    await expect(page.locator('#ahu-verdict')).toContainText('냉매 부족으로 냉방하지 못합니다');

    const coolingSetpoint = page.locator('#ahu-p-cool-sp');
    await coolingSetpoint.fill('10');
    await coolingSetpoint.press('Enter');
    await expect(page.locator('#ahu-params-hint')).toContainText('허용 범위');

    await page.click('#ahu-ovr-toggle');
    await expect(page.locator('#ahu-ovr-state')).toContainText('강제됨');
    await page.click('#ahu-lls-jumper');
    await expect(page.locator('#ahu-lls-msg')).toContainText('단자 사이에 점퍼를 설치했습니다');
    await expect(page.locator('.ddcw-unit-link[href="/ko/simulators/ddc-workbench-fcu.html"]')).toHaveText('FCU');

    expect(errors, 'Korean AHU workbench should log no errors').toEqual([]);
});

test('Korean education widgets retain localized interactive and unit copy', async ({ page }) => {
    const errors = watchErrors(page);

    await page.goto('/ko/education/analog-sensing.html');
    await expect(page.locator('#asn-map-sub')).toContainText('범위 안');
    await page.locator('#asn-map-slider').evaluate((element) => {
        element.value = '3';
        element.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(page.locator('#asn-map-sub')).toContainText('라이브 제로 미만');

    await page.goto('/ko/education/temperature-sensors.html');
    const slope = page.locator('span[data-us*="240"][data-metric*="440"]').first();
    await expect(slope).toContainText('°F당 약 240 Ω');
    await page.click('.units-btn[data-units="metric"]');
    await expect(slope).toContainText('°C당 약 440 Ω');

    expect(errors, 'Korean education widgets should log no errors').toEqual([]);
});

test('Korean balancing and pressure widgets localize every exercised state', async ({ page }) => {
    const errors = watchErrors(page);

    await page.goto('/ko/education/balancing.html');
    await page.locator('#bal-dp-slider').evaluate((element) => {
        element.value = '1';
        element.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(page.locator('#bal-cbv-state')).toContainText('부족');
    await expect(page.locator('#bal-abv-state')).toContainText('부족');
    await expect(page.locator('#bal-picv-state')).toContainText('부족');
    await page.click('.units-btn[data-units="metric"]');
    await expect(page.locator('#bal-dp-unit')).toHaveText('m');

    await page.goto('/ko/education/building-pressure.html');
    await page.click('[data-bp-preset="econ-open"]');
    await expect(page.locator('#bp-w-status')).toContainText('강한 양압');
    await page.click('[data-bp-preset="hood"]');
    await expect(page.locator('#bp-w-status')).toContainText('음압');

    await page.goto('/ko/education/duct-static-control.html');
    await page.click('[data-ds-preset="restriction"]');
    await expect(page.locator('#ds-w-status')).toContainText('루프가 막힘을 감추고 있습니다');
    await page.click('[data-ds-preset="old-fix"]');
    await expect(page.locator('#ds-w-status')).toContainText('센서가 625 Pa에서 포화되었습니다');

    expect(errors, 'Korean balancing and pressure widgets should log no errors').toEqual([]);
});

test('Korean BACnet tools keep localized copy after interactive updates', async ({ page }) => {
    const errors = watchErrors(page);

    await page.goto('/ko/tools/bacnet-ip-converter.html');
    await expect(page.locator('#b2i-formula')).toContainText('포트 47808');
    await expect(page.locator('#boi-out-type')).toContainText('장치(Device)');
    await page.fill('#b2i-hex', 'XYZ');
    await expect(page.locator('#b2i-callout')).toContainText('16진수는 8자');

    await page.goto('/ko/tools/bacnet-priority.html');
    await expect(page.locator('#bpri-status')).toContainText('슬롯 8(운전자 수동 명령)의 명령이 적용됨');
    await page.fill('#bpri-slot-8', '');
    await expect(page.locator('#bpri-status')).toContainText('슬롯 16의 명령이 적용됨');

    await page.goto('/ko/tools/bacnet-units.html');
    await expect(page.locator('#bunit-status')).toContainText('표준 공학 단위');
    await page.fill('#bunit-id', '255');
    await expect(page.locator('#bunit-status')).toContainText('예약된 상한값');
    await page.fill('#bunit-id', '256');
    await expect(page.locator('#bunit-status')).toContainText('전용/벤더 범위');

    await page.goto('/ko/tools/bacnet-objects.html');
    await expect(page.locator('#bo-table-objects td.bo-id').first()).toHaveAttribute('title', '0 복사');
    const definedTermSets = await page.locator('script[type="application/ld+json"]').evaluateAll(scripts =>
        scripts.map(script => JSON.parse(script.textContent))
            .filter(node => node['@type'] === 'DefinedTermSet'));
    expect(definedTermSets).toHaveLength(3);
    expect(definedTermSets[0].hasDefinedTerm[0].description).toContain('아날로그 센싱값');

    expect(errors, 'Korean BACnet tool interactions should log no errors').toEqual([]);
});

test('Korean protocol references localize decoder, CRC, and address states', async ({ page }) => {
    const errors = watchErrors(page);

    await page.goto('/ko/tools/bacnet-error-codes.html');
    await expect(page.locator('#bec-status')).toHaveText('디코딩됨');
    await expect(page.locator('#bec-formula')).toContainText('클래스 2 / 코드 32');
    await expect(page.locator('#bec-table-codes td.bec-id').first()).toHaveAttribute('title', '0 복사');
    await page.click('.bec-mode[data-mode="reject"]');
    await expect(page.locator('#bec-primary-label')).toHaveText('거부 사유');
    await page.fill('#bec-reject', '999');
    await expect(page.locator('#bec-callout')).toContainText('거부 사유는 0–255');
    await page.fill('#bec-search', 'unknown');
    await expect(page.locator('#bec-count-total')).toContainText('전체');

    await page.goto('/ko/tools/bacnet-vendor-ids.html');
    await expect(page.locator('#bvid-status')).toHaveText('등록된 벤더 ID');
    await expect(page.locator('#bvid-table tbody tr:not(.bvid-empty) td').first()).toHaveAttribute('title', '0 복사');
    await page.fill('#bvid-id', '555');
    await expect(page.locator('#bvid-status')).toContainText('ASHRAE 예약 번호');
    await page.fill('#bvid-id', '65535');
    await expect(page.locator('#bvid-status')).toContainText('이 스냅샷에서 미할당');

    await page.goto('/ko/tools/modbus-functions.html');
    await expect(page.locator('#mf-crc-verify')).toContainText('CRC와 일치하지 않습니다');
    await page.click('[data-tab="crc"]');
    await page.fill('#mf-crc-in', '');
    await expect(page.locator('#mf-crc-callout')).toContainText('16진수 바이트로 붙여 넣으세요');
    await expect(page.locator('#mf-crc-verify')).toContainText('바이트를 3개 이상');

    await page.goto('/ko/tools/modbus-register-viewer.html');
    await expect(page.locator('#bit-grid button').first()).toHaveAttribute('aria-label', '비트 15, 값 1');
    await expect(page.locator('#mod-highbit-hint')).toContainText('부호 있는 값은');
    await page.fill('#mod-dec', '40001');
    await expect(page.locator('#mod-trap-hint')).toContainText('레지스터 주소로 보입니다');
    await expect(page.locator('#mod-trap-hint a')).toHaveAttribute('href', '/ko/education/modbus-decoding.html');
    await page.fill('#mod-dec', '70000');
    await expect(page.locator('#mod-single-callout')).toContainText('0–65535 범위의 정수');
    await page.click('[data-tab="convert"]');
    await page.fill('#mod-addr', '20001');
    await expect(page.locator('#mod-conv-callout')).toContainText('이 주소에 해당하는 테이블이 없습니다');
    await page.fill('#mod-addr', '40001');
    await expect(page.locator('#mod-conv-sentence')).toContainText('홀딩 레지스터 테이블');

    expect(errors, 'Korean protocol references should log no errors').toEqual([]);
});

test('Korean field calculators localize validation and computed states', async ({ page }) => {
    const errors = watchErrors(page);

    await page.goto('/ko/tools/affinity-laws.html');
    await expect(page.locator('#af-s-formula')).toContainText('비율 = 50 ÷ 60');
    await page.fill('#af-s-n1', '0');
    await expect(page.locator('#af-s-callout')).toContainText('기준 속도는 0보다 크고');

    await page.goto('/ko/tools/airflow.html');
    await expect(page.locator('#vp-k-out-label')).toHaveText('풍량');
    await expect(page.locator('#vp-k-copy')).toHaveText('CFM 복사');
    await page.fill('#vp-k-vp', '-0.1');
    await expect(page.locator('#vp-k-callout')).toContainText('센싱 튜브가 서로 바뀐 것');
    await page.selectOption('#vp-k-solve', 'k');
    await page.fill('#vp-k-vp', '0.64');
    await expect(page.locator('#vp-k-out-label')).toHaveText('K 계수');
    await expect(page.locator('#vp-k-copy')).toHaveText('K 복사');

    await page.goto('/ko/tools/waterside-load.html');
    await expect(page.locator('#wl-out-label')).toHaveText('부하 (MBH)');
    await page.fill('#wl-flow', '-1');
    await expect(page.locator('#wl-callout')).toContainText('유량과 ΔT는 음수일 수 없습니다');
    await page.fill('#wl-flow', '20');
    await page.selectOption('#wl-solve', 'flow');
    await page.fill('#wl-dt', '0');
    await expect(page.locator('#wl-callout')).toContainText('유량을 계산하려면 ΔT가 0보다 커야 합니다');
    await page.click('.units-btn[data-units="metric"]');
    await expect(page.locator('#wl-out-label')).toHaveText('유량 (L/s)');
    await expect(page.locator('[data-metric*="물의 비열"]')).toContainText('물의 비열');

    await page.goto('/ko/tools/transformer-sizing.html');
    await expect(page.locator('#xf-name-1')).toHaveValue('컨트롤러');
    await expect(page.locator('#xf-status')).toContainText('정상');
    await expect(page.locator('#xf-formula')).toContainText('퓨즈:');
    await page.selectOption('#xf-size', '40');
    await page.fill('#xf-va-1', '20');
    await expect(page.locator('#xf-status')).toContainText('100 % 초과');
    for (let index = 1; index <= 8; index++) {
        await page.fill(`#xf-va-${index}`, '');
    }
    await expect(page.locator('#xf-status')).toHaveText('장치 부하를 하나 이상 입력하세요.');

    await page.goto('/ko/tools/valve-authority.html');
    await expect(page.locator('#va-verdict')).toContainText('영향도 양호(β = 0.70)');
    await page.fill('#va-rest', '30');
    await expect(page.locator('#va-verdict')).toContainText('영향도 불량');
    await page.fill('#va-valve', '-1');
    await expect(page.locator('#va-verdict')).toHaveText('압력강하는 음수일 수 없습니다.');
    await page.fill('#va-valve', '0');
    await page.fill('#va-rest', '0');
    await expect(page.locator('#va-verdict')).toContainText('총 압력강하가 0');

    expect(errors, 'Korean calculator interactions should log no errors').toEqual([]);
});

test('Korean VFD and load-piping lessons localize capstone state changes', async ({ page }) => {
    const errors = watchErrors(page);

    await page.goto('/ko/education/vfds.html');
    await page.click('#vfd-try-classic');
    await page.click('#vfd-net-run');
    await expect(page.locator('#vfd-msgs')).toContainText('RUN 명령을 무시');
    await expect(page.locator('#vfd-anecdote-wrap')).toContainText('오후 반나절');
    await page.click('#vfd-di-closed');
    await expect(page.locator('#vfd-state')).toContainText('운전 중');

    await page.goto('/ko/education/load-piping.html');
    await page.click('#lp-w-try-night');
    await expect(page.locator('#lp-w-state-text')).toHaveText('체절');
    await expect(page.locator('#lp-w-anecdote')).toContainText('찾았습니다');
    await page.click('#lp-w-bypass-on');
    await expect(page.locator('#lp-w-state-text')).toHaveText('정상');
    await expect(page.locator('#lp-w-pump-readout-label')).toHaveText('펌프 속도');

    expect(errors, 'Korean education capstones should log no errors').toEqual([]);
});
