-- Add moderation flag columns to ratings table
-- flagged: boolean, default false — set true when a user reports the review
-- flagged_reason: text — reason provided by the reporter

alter table ratings
  add column flagged boolean not null default false,
  add column flagged_reason text;

-- Index for admin moderation queue (find all flagged reviews quickly)
create index idx_ratings_flagged on ratings (flagged) where flagged = true;
