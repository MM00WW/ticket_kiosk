import { db } from "../src/server/db";
for (let id = 1; id <= 4; id++)
  await db.serviceWindow.upsert({
    where: { id },
    update: {},
    create: { id, name: `Window ${id}` },
  });
await db.systemSetting.upsert({
  where: { key: "speechLanguage" },
  update: {},
  create: { key: "speechLanguage", value: "en" },
});
await db.$disconnect();
