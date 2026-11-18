export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (url.hostname === 'www.datahack.org.il' && ['GET', 'HEAD'].includes(context.request.method)) {
    url.hostname = 'datahack.org.il';
    return Response.redirect(url.toString(), 308);
  }

  const response = await context.next();
  if (url.hostname === 'datahack.org.il') return response;
  const headers = new Headers(response.headers);
  headers.set('X-Robots-Tag', 'noindex, nofollow');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
