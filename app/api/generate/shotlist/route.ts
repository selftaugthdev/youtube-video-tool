import { generateShotlist } from "@/lib/claude";
import { handleRoute } from "@/lib/apiHandler";

interface Body {
  scriptText: string;
}

export const POST = handleRoute<Body>(async ({ scriptText }) => {
  const shots = await generateShotlist(scriptText);
  return { shots };
});
