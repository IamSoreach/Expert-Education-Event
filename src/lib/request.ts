type RequestLike = {
  headers: Headers;
};

export function getRequestIpFromHeaders(headers: Headers): string | undefined {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const [first] = forwarded.split(",");
    const value = first?.trim();
    if (value) {
      return value;
    }
  }

  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  return undefined;
}

export function getRequestIp(req: RequestLike): string | undefined {
  return getRequestIpFromHeaders(req.headers);
}

export function getRequestIdentifier(req: RequestLike): string {
  const ip = getRequestIp(req);
  if (ip) {
    return ip;
  }

  const ua = req.headers.get("user-agent")?.trim();
  if (ua) {
    return `ua:${ua.slice(0, 80)}`;
  }

  return "unknown";
}
