/** Pure release gates: a previous build or a baseline measurement cannot approve a release. */
import { createHash } from 'node:crypto';

export function validateReleaseReports(browser, performance, manifestBytes) {
  const digest = createHash('sha256').update(manifestBytes).digest('hex');
  if (browser?.status !== 'passed' || browser.buildManifestSha256 !== digest)
    throw new Error('Falta una revisión de navegador aprobada del build exacto.');
  if (
    performance?.status !== 'passed' ||
    performance.mode !== 'verify' ||
    performance.buildManifestSha256 !== digest ||
    performance.cases?.length !== 4 ||
    performance.errors?.length !== 0
  )
    throw new Error('Falta la comprobación de rendimiento aprobada del build exacto.');
  return digest;
}
