export async function onRequestPost({ request, env }) {
  const scriptUrl = env.VITE_APPS_SCRIPT_URL || env.APPS_SCRIPT_URL;
  if (!scriptUrl) {
    return Response.json({ status: 'error', message: 'The Apps Script endpoint is not configured for this Cloudflare deployment.' }, { status: 503 });
  }

  let destination;
  try {
    destination = new URL(scriptUrl);
  } catch {
    return Response.json({ status: 'error', message: 'The Apps Script endpoint URL is invalid.' }, { status: 500 });
  }
  if (destination.hostname !== 'script.google.com' || !/^\/macros\/s\/[^/]+\/exec\/?$/.test(destination.pathname)) {
    return Response.json({ status: 'error', message: 'The configured endpoint is not an Apps Script web app URL.' }, { status: 500 });
  }

  let vote;
  try {
    vote = await request.json();
  } catch {
    return Response.json({ status: 'error', message: 'The vote request is not valid JSON.' }, { status: 400 });
  }
  if (!vote || typeof vote !== 'object' || Array.isArray(vote)) {
    return Response.json({ status: 'error', message: 'The vote request is not valid.' }, { status: 400 });
  }

  const visitorIp = request.headers.get('CF-Connecting-IP') || '';
  if (!visitorIp) {
    return Response.json({ status: 'error', message: 'Your IP address could not be verified. This vote was not recorded.' }, { status: 503 });
  }
  vote.ip = visitorIp;

  try {
    const upstream = await fetch(destination, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(vote),
      redirect: 'follow',
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { 'Content-Type': upstream.headers.get('Content-Type') || 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  } catch {
    return Response.json({ status: 'error', message: 'Could not reach the voting service. Please try again.' }, { status: 502 });
  }
}
