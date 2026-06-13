import { schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';

// Add new migrations here as addColumns/createTable calls when bumping schema version.
// Never modify existing migrations — always append new ones.
export default schemaMigrations({ migrations: [] });
