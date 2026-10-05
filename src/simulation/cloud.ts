export type Cloud = 'aws' | 'azure' | 'google'

export const CLOUDS: { id: Cloud; label: string }[] = [
  { id: 'aws', label: 'AWS' },
  { id: 'azure', label: 'Azure' },
  { id: 'google', label: 'Google' },
]

type Trio = Record<Cloud, string>

export const product = {
  directory: {
    aws: 'Amazon RDS for PostgreSQL',
    azure: 'Azure Database for PostgreSQL',
    google: 'Cloud SQL for PostgreSQL',
  },
  gateway: {
    aws: 'Application Load Balancer',
    azure: 'Azure Application Gateway',
    google: 'Cloud Load Balancing',
  },
  compute: {
    aws: 'Amazon EC2',
    azure: 'Azure Virtual Machines',
    google: 'Compute Engine',
  },
  redis: {
    aws: 'Amazon ElastiCache for Redis',
    azure: 'Azure Cache for Redis',
    google: 'Memorystore for Redis',
  },
  transient: {
    aws: 'Amazon Keyspaces',
    azure: 'Azure Cosmos DB for Apache Cassandra',
    google: 'Bigtable',
  },
  push: {
    aws: 'Amazon SNS',
    azure: 'Azure Notification Hubs',
    google: 'Firebase Cloud Messaging',
  },
  object: {
    aws: 'Amazon S3',
    azure: 'Azure Blob Storage',
    google: 'Cloud Storage',
  },
  cdn: {
    aws: 'Amazon CloudFront',
    azure: 'Azure Front Door',
    google: 'Cloud CDN',
  },
} satisfies Record<string, Trio>

export function mediaUri(cloud: Cloud): string {
  if (cloud === 'aws') return 's3://chat-media-prod/ciphertext/9f3ce1'
  if (cloud === 'azure') return 'https://chatmedia.blob.core.windows.net/ciphertext/9f3ce1'
  return 'gs://chat-media-prod/ciphertext/9f3ce1'
}

export function redisHost(cloud: Cloud): string {
  if (cloud === 'aws') return 'session.abc.ng.0001.use1.cache.amazonaws.com:6379'
  if (cloud === 'azure') return 'chat-session.redis.cache.windows.net:6380'
  return '10.8.0.12:6379'
}

export function directoryHost(cloud: Cloud): string {
  if (cloud === 'aws') return 'user-directory.xxxx.us-east-1.rds.amazonaws.com'
  if (cloud === 'azure') return 'user-directory.postgres.database.azure.com'
  return 'chat:us-central1:user-directory'
}
