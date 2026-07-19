import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const workflow = await readFile('.github/workflows/deploy-pages.yml', 'utf8');
const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
const packageLock = JSON.parse(await readFile('package-lock.json', 'utf8'));
const nodeVersion = (await readFile('.node-version', 'utf8')).trim();
const dependabot = await readFile('.github/dependabot.yml', 'utf8');

assert.equal(nodeVersion, '22.23.1', '.node-version must pin the approved Node 22 release');
assert.equal(packageJson.engines?.node, nodeVersion, 'package engines.node must match .node-version');
assert.equal(packageLock.packages?.['']?.engines?.node, nodeVersion, 'lockfile engines.node must match .node-version');

assert.match(workflow, /pull_request:/, 'Pages workflow must validate pull requests');
assert.match(workflow, /workflow_dispatch:/, 'Pages workflow must remain manually dispatchable');
assert.match(workflow, /push:[\s\S]*branches:[\s\S]*- main/, 'Pages workflow must validate main pushes');
const globalPermissions = workflow.slice(0, workflow.indexOf('\njobs:'));
assert.match(globalPermissions, /permissions:\s*\n\s+contents: read/, 'default permissions must be contents: read');
assert.doesNotMatch(globalPermissions, /pages: write|id-token: write/, 'deployment permissions must not be global');

for (const job of ['build', 'browser', 'seam', 'performance', 'quality_gate', 'publish_pages_artifact', 'deploy']) {
  assert.match(workflow, new RegExp(`^  ${job}:`, 'm'), `workflow job missing: ${job}`);
}
assert.match(workflow, /name: Quality gate/, 'aggregate check name must remain stable');
for (const command of ['verify:browser', 'verify:seam', 'verify:performance']) {
  assert.match(workflow, new RegExp(`npm run ${command}`), `QA lane missing ${command}`);
}
assert.ok((workflow.match(/node-version-file: \.node-version/g) ?? []).length >= 4, 'every Node job must use .node-version');
assert.match(workflow, /uses: actions\/upload-artifact@[^\s#]+[^\n]*[\s\S]*path: dist/, 'build must upload the single dist artifact');
assert.match(workflow, /name: Verify built static artifact[\s\S]*npm run verify:dist/, 'build must verify the exact dist before upload');
assert.match(workflow, /VERIFY_LAYOUT=1 URL='http:\/\/127\.0\.0\.1:4173\/' npm run verify:dist/, 'downloaded dist needs an HTTP and mobile target-size smoke gate');
assert.ok((workflow.match(/uses: actions\/download-artifact@/g) ?? []).length >= 4, 'QA and publish jobs must consume the built dist');
assert.match(workflow, /publish_pages_artifact:[\s\S]*needs: quality_gate[\s\S]*github\.event_name != 'pull_request'/, 'Pages artifact must wait for non-PR quality success');
assert.equal(
  (workflow.match(/if: github\.event_name != 'pull_request' && github\.ref == 'refs\/heads\/main'/g) ?? []).length,
  2,
  'both Pages artifact publication and deployment must be restricted to main',
);
assert.match(workflow, /deploy:[\s\S]*pages: write[\s\S]*id-token: write/, 'only deploy receives Pages permissions');
assert.doesNotMatch(workflow, /^\s*uses:\s+[^#\n]+@[vV]\d/m, 'workflow actions must use immutable commit SHAs');
for (const actionSha of [
  'df4cb1c069e1874edd31b4311f1884172cec0e10',
  '49933ea5288caeca8642d1e84afbd3f7d6820020',
  'ea165f8d65b6e75b540449e92b4886f43607fa02',
  'd3f86a106a0bac45b974a628896c90dbdf5c8093',
  '7b1f4a764d45c48632c6b24a0339c27f5614fb0b',
  'd6db90164ac5ed86f2b6aed7e0febac5b3c0c03e',
]) {
  assert.ok(workflow.includes(`@${actionSha}`), `workflow is missing approved action SHA ${actionSha}`);
}

for (const ecosystem of ['npm', 'github-actions']) {
  assert.match(dependabot, new RegExp(`package-ecosystem: ["']${ecosystem}["']`), `Dependabot missing ${ecosystem}`);
}
assert.ok((dependabot.match(/interval: ["']weekly["']/g) ?? []).length >= 2, 'Dependabot must run weekly for both ecosystems');
assert.match(dependabot, /groups:/, 'Dependabot updates must be grouped');

console.log('CI contract verified: Node pin, PR-safe Pages topology, parallel QA, and grouped Dependabot.');
