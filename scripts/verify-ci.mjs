import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const workflow = await readFile('.github/workflows/deploy-pages.yml', 'utf8');
const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
const packageLock = JSON.parse(await readFile('package-lock.json', 'utf8'));
const nodeVersion = (await readFile('.node-version', 'utf8')).trim();
const dependabot = await readFile('.github/dependabot.yml', 'utf8');
const liveSmoke = await readFile('scripts/verify-live.mjs', 'utf8');

assert.equal(nodeVersion, '22.23.1', '.node-version must pin the approved Node 22 release');
assert.equal(packageJson.engines?.node, nodeVersion, 'package engines.node must match .node-version');
assert.equal(packageLock.packages?.['']?.engines?.node, nodeVersion, 'lockfile engines.node must match .node-version');

assert.match(workflow, /pull_request:/, 'Pages workflow must validate pull requests');
assert.match(workflow, /workflow_dispatch:/, 'Pages workflow must remain manually dispatchable');
assert.match(workflow, /push:[\s\S]*branches:[\s\S]*- main/, 'Pages workflow must validate main pushes');
const globalPermissions = workflow.slice(0, workflow.indexOf('\njobs:'));
assert.match(globalPermissions, /permissions:\s*\n\s+contents: read/, 'default permissions must be contents: read');
assert.doesNotMatch(globalPermissions, /pages: write|id-token: write/, 'deployment permissions must not be global');

for (const job of ['build', 'browser', 'seam', 'seam_macos', 'quality_gate', 'publish_pages_artifact', 'deploy']) {
  assert.match(workflow, new RegExp(`^  ${job}:`, 'm'), `workflow job missing: ${job}`);
}
assert.match(workflow, /name: Quality gate/, 'aggregate check name must remain stable');
assert.match(
  workflow,
  /DIST_ARTIFACT: site-dist-\$\{\{ github\.sha \}\}-\$\{\{ github\.run_attempt \}\}/,
  'full workflow reruns need a unique immutable artifact name',
);
assert.match(
  workflow,
  /build:[\s\S]*outputs:[\s\S]*dist-artifact-id: \$\{\{ steps\.upload-dist\.outputs\.artifact-id \}\}[\s\S]*id: upload-dist[\s\S]*name: \$\{\{ env\.DIST_ARTIFACT \}\}/,
  'build must expose the uploaded immutable artifact id',
);
assert.match(
  workflow,
  /name: Review dependency changes[\s\S]*if: github\.event_name == 'pull_request'[\s\S]*uses: actions\/dependency-review-action@a1d282b36b6f3519aa1f3fc636f609c47dddb294[\s\S]*fail-on-severity: moderate[\s\S]*fail-on-scopes: runtime, development, unknown/,
  'pull requests must reject newly introduced moderate-or-higher vulnerable dependencies in every scope',
);
for (const command of ['verify:browser', 'verify:seam']) {
  assert.match(workflow, new RegExp(`npm run ${command}`), `QA lane missing ${command}`);
}
assert.match(
  workflow,
  /seam_macos:[\s\S]*runs-on: macos-15[\s\S]*PW_CHANNEL=chrome[\s\S]*npm run verify:seam/,
  'the exact seam contract must run in hosted macOS Chrome as well as Linux Chromium',
);
assert.match(
  workflow,
  /quality_gate:[\s\S]*- seam_macos[\s\S]*MACOS_SEAM_RESULT:[\s\S]*test "\$MACOS_SEAM_RESULT" = success/,
  'the stable quality gate must require the macOS seam lane',
);
assert.doesNotMatch(
  workflow,
  /npm run verify:performance/,
  'hardware-sensitive full-circuit performance evidence must remain outside hosted CI',
);
assert.ok((workflow.match(/node-version-file: \.node-version/g) ?? []).length >= 4, 'every Node job must use .node-version');
assert.match(workflow, /uses: actions\/upload-artifact@[^\s#]+[^\n]*[\s\S]*path: dist/, 'build must upload the single dist artifact');
assert.match(workflow, /name: Verify built static artifact[\s\S]*npm run verify:dist/, 'build must verify the exact dist before upload');
assert.match(workflow, /VERIFY_LAYOUT=1 URL='http:\/\/127\.0\.0\.1:4173\/' npm run verify:dist/, 'downloaded dist needs an HTTP and mobile target-size smoke gate');
assert.ok((workflow.match(/uses: actions\/download-artifact@/g) ?? []).length >= 5, 'QA, publish, and live smoke jobs must consume the built dist');
assert.equal(
  (workflow.match(/artifact-ids: \$\{\{ needs\.build\.outputs\.dist-artifact-id \}\}/g) ?? []).length,
  5,
  'every dist consumer must select the exact build artifact id',
);
assert.doesNotMatch(workflow, /overwrite:\s*true/, 'immutable release evidence must never be overwritten');
assert.match(workflow, /publish_pages_artifact:[\s\S]*needs:[\s\S]*- build[\s\S]*- quality_gate[\s\S]*github\.event_name != 'pull_request'/, 'Pages artifact must wait for build and non-PR quality success');
assert.match(workflow, /deploy:[\s\S]*needs:[\s\S]*- build[\s\S]*- publish_pages_artifact/, 'post-deploy parity must retain access to the exact build artifact id');
assert.equal(
  (workflow.match(/if: github\.event_name != 'pull_request' && github\.ref == 'refs\/heads\/main'/g) ?? []).length,
  2,
  'both Pages artifact publication and deployment must be restricted to main',
);
assert.match(workflow, /deploy:[\s\S]*pages: write[\s\S]*id-token: write/, 'only deploy receives Pages permissions');
assert.match(
  workflow,
  /deploy:[\s\S]*permissions:\s*\n\s+contents: read\s*\n\s+pages: write\s*\n\s+id-token: write/,
  'deploy must retain only checkout read access plus Pages write and OIDC permissions',
);
assert.match(
  workflow,
  /name: Deploy GitHub Pages[\s\S]*name: Checkout smoke test[\s\S]*name: Download immutable dist for live comparison[\s\S]*name: Verify live Pages origin/,
  'a successful Pages deployment must be followed by exact live-origin artifact verification',
);
assert.match(
  workflow,
  /DEPLOYMENT_URL: \$\{\{ steps\.deployment\.outputs\.page_url \}\}[\s\S]*run: timeout 150s node scripts\/verify-live\.mjs/,
  'live-origin verification must use the deployment output and a bounded outer timeout',
);
assert.doesNotMatch(workflow, /^\s*uses:\s+[^#\n]+@[vV]\d/m, 'workflow actions must use immutable commit SHAs');
for (const actionSha of [
  '9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0',
  '820762786026740c76f36085b0efc47a31fe5020',
  '043fb46d1a93c77aae656e7c1c64a875d1fc6a0a',
  '3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c',
  'fc324d3547104276b827a68afc52ff2a11cc49c9',
  'cd2ce8fcbc39b97be8ca5fce6e763baed58fa128',
  'a1d282b36b6f3519aa1f3fc636f609c47dddb294',
]) {
  assert.ok(workflow.includes(`@${actionSha}`), `workflow is missing approved action SHA ${actionSha}`);
}

for (const ecosystem of ['npm', 'github-actions']) {
  assert.match(dependabot, new RegExp(`package-ecosystem: ["']${ecosystem}["']`), `Dependabot missing ${ecosystem}`);
}
assert.ok((dependabot.match(/interval: ["']weekly["']/g) ?? []).length >= 2, 'Dependabot must run weekly for both ecosystems');
assert.match(dependabot, /groups:/, 'Dependabot updates must be grouped');

function dependencyIgnorePattern(dependency, field, value) {
  const escape = (input) => input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    `-\\s+dependency-name: ["']${escape(dependency)}["']\\s*\\n\\s+${escape(field)}:\\s*\\n\\s+- ["']${escape(value)}["']`,
  );
}

const viteEightIgnore = dependencyIgnorePattern('vite', 'versions', '8.x');
assert.match(
  dependabot,
  viteEightIgnore,
  'Dependabot must not reintroduce the proven Vite 8 macOS seam regression',
);
assert.doesNotMatch(
  '- dependency-name: "vite"\n- dependency-name: "unrelated"\n  versions:\n    - "8.x"',
  viteEightIgnore,
  'the Vite 8 guard must not accept a versions rule from another dependency entry',
);
for (const dependency of ['@types/node', 'typescript']) {
  assert.match(
    dependabot,
    dependencyIgnorePattern(dependency, 'update-types', 'version-update:semver-major'),
    `Dependabot must gate incompatible ${dependency} major upgrades`,
  );
}

for (const route of [
  "fetchHtml('/')",
  "fetchHtml('/about/')",
  "fetchHtml('/beijing-loop/')",
  "fetchBytes('/social-preview.png'",
  "fetchBytes('/profile-preview.png'",
  "fetchBytes('/resume.pdf'",
  "'/poe2/guides/classes-explained.html'",
]) {
  assert.ok(liveSmoke.includes(route), `live smoke is missing required proof target ${route}`);
}
assert.match(liveSmoke, /AbortSignal\.timeout\(requestTimeoutMs\)/, 'live requests need bounded timeouts');
assert.match(liveSmoke, /sha256\(bytes\)/, 'approved binary assets need byte-level verification');
assert.match(liveSmoke, /verifyDistParity\(\)/, 'live smoke must compare every deployed file with the immutable dist');
assert.match(liveSmoke, /deployed bytes differ from immutable dist/, 'live byte drift must fail the deployment job');

console.log('CI contract verified: Node pin, dependency review, parallel QA, exact deployment parity, and grouped Dependabot.');
