import { createMirror } from "./mirror";
import { prismaMirrorStore } from "./mirror-store";

/** Instans cermin untuk aplikasi (penyimpanan = Prisma). Rute API dan cron memakai ini. */
export const mirror = createMirror({ store: prismaMirrorStore });
