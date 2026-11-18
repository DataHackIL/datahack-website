const apex = 'datacoach.org.il';
const www = 'www.datacoach.org.il';

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const read = request.method === 'GET' || request.method === 'HEAD';

  if (url.hostname === www && read) {
    url.hostname = apex;
    url.protocol = 'https:';
    url.port = '';
    return Response.redirect(url.toString(), 308);
  }

  if (url.hostname === apex && url.pathname === '/robots.txt' && read) {
    return new Response(request.method === 'HEAD' ? null : 'User-agent: *\nAllow: /\n', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const response = await context.next();
  const headers = new Headers(response.headers);
  if (url.hostname === apex) headers.delete('X-Robots-Tag');
  else headers.set('X-Robots-Tag', 'noindex, nofollow');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
