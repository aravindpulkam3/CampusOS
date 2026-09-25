import { MongoMemoryReplSet } from "mongodb-memory-server";

// One in-memory MongoDB for the whole run. It must be a replica set: the code
// under test uses transactions. Pinned to 7.0, the newest server version the
// installed MongoDB driver (5.x, via Mongoose 7) supports.
export default async function setup(project) {
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
    binary: { version: "7.0.14" },
  });
  project.provide("mongoUri", replSet.getUri());

  return async () => {
    await replSet.stop();
  };
}
