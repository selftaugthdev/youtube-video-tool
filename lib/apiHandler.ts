import { NextResponse } from "next/server";

export function handleRoute<Body>(fn: (body: Body) => Promise<unknown>) {
  return async (req: Request) => {
    try {
      const body = (await req.json()) as Body;
      const result = await fn(body);
      return NextResponse.json(result);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}
