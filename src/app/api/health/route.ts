export async function GET(): Promise<Response> {
  return Response.json(
    {
      status: "ok",
      service: "event-ticketing-mvp",
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}
