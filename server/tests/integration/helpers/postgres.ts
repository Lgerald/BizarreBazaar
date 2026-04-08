import { execFileSync } from "node:child_process";
import { GenericContainer, Wait } from "testcontainers";

export type StartedPostgres = {
  databaseUrl: string;
  stop: () => Promise<void>;
};

export async function startPostgresForTests(): Promise<StartedPostgres> {
  const user = "postgres";
  const password = "postgres";
  const db = "bizarrebazaar_test";

  const container = await new GenericContainer("postgres:16")
    .withEnvironment({
      POSTGRES_USER: user,
      POSTGRES_PASSWORD: password,
      POSTGRES_DB: db,
    })
    .withExposedPorts(5432)
    .withWaitStrategy(Wait.forLogMessage("database system is ready to accept connections"))
    .start();

  const host = container.getHost();
  const port = container.getMappedPort(5432);
  const databaseUrl = `postgresql://${user}:${password}@${host}:${port}/${db}?schema=public`;

  return {
    databaseUrl,
    stop: async () => {
      await container.stop();
    },
  };
}

export function prismaMigrateDeploy(databaseUrl: string) {
  // Prisma v7 reads DATABASE_URL from env (via prisma.config.ts env() helper).
  execFileSync(process.platform === "win32" ? "npx.cmd" : "npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
  });
}

