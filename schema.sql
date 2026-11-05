create table if not exists customers (
  id bigserial primary key,
  brand_id text not null,
  external_id text not null,
  name text not null,
  phone text not null,
  created_at timestamptz not null default now(),
  unique (brand_id, external_id)
);

create table if not exists conversations (
  id bigserial primary key,
  brand_id text not null,
  customer_id bigint not null references customers(id),
  status text not null default 'open',
  last_message_at timestamptz not null default now()
);
-- one open conversation per customer
create unique index if not exists one_open_conv_per_customer
  on conversations (customer_id) where status = 'open';

create table if not exists messages (
  id bigserial primary key,
  conversation_id bigint not null references conversations(id),
  external_id text,
  sender text not null check (sender in ('customer','agent')),
  text text not null,
  created_at timestamptz not null default now()
);
create index if not exists messages_conv_idx on messages (conversation_id, id);

create table if not exists drafts (
  id bigserial primary key,
  message_id bigint not null unique references messages(id),
  conversation_id bigint not null references conversations(id),
  text text,
  needs_human boolean not null default false,
  reason text,
  status text not null default 'pending' check (status in ('pending','ready','failed','used')),
  error text,
  created_at timestamptz not null default now(),
  used_at timestamptz
);

-- every webhook delivery is logged here; the unique key makes duplicates harmless
create table if not exists webhook_events (
  id bigserial primary key,
  brand_id text not null,
  event_id text not null,
  raw jsonb,
  received_at timestamptz not null default now(),
  unique (brand_id, event_id)
);
