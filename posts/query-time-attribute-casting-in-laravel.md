---
date: "2020-05-31"
title: "Query-time Attribute Casting in Laravel"
post_tags:
  - eloquent
  - web development
  - laravel
  - php
---

Back in January [I opened a small pull request to the Laravel framework](https://github.com/laravel/framework/pull/31102) to enable query-time casting of Eloquent attributes. Laravel already allowed static casting, where an array `$casts` could be defined on a model, containing key-value pairs of attributes and the data type they should be automatically cast to. This is a very nice quality-of-life feature for things like dates or JSON columns, allowing you to transparently map flat data to rich objects.

For Laravel 6, [Jonathan Reinink](https://twitter.com/reinink) submitted some [very nice improvements](https://github.com/laravel/framework/pull/29567) to subquery selects, which I eagerly adopted in both personal and work projects.

## The problem

One small snag came to light though: while I could now use subqueries more easily than ever, the resulting values were always plain text. In one particular system I manage, a common type of query results in several dates, where the columns on the main table being queried are automatically cast to Carbon objects, while the columns selected from subqueries are plain text timestamps.

While far from the end of the world, it was a pain to deal with:

- You could "just-in-time" convert to a Carbon instance by hand, perhaps when the date is displayed. But creating a new instance inside a view feels wrong, and assigning it to a variable if the date is referenced multiple times is out of the question. Not to mention needing to remember which dates need to be manually cast and which don’t, or handing null values — yuck.

- Manually setting the attribute value to a Carbon instance immediately after the query feels like pointless busywork, especially if you have multiple values to convert, or similar queries in multiple places.

- Because of the way `$casts` works, you can actually add your dynamic columns even if they aren't present on the model the majority of the time, and it will work. This has a few problems though. For one, you're just asking for someone to refactor them away without realising their purpose — lets hope your tests catch it! Second, it's just plain messy. The `$casts` array itself is fine because it's globally applicable, but to mix in casts that are only relevant to one or two places in your entire app makes things hard to follow. Lastly, it's inflexible. While it's not likely to happen all that often, a single static list of casts does not allow you to re-define casts for specific queries, nor map the same derived column name to varying data types.

With this in mind, I set out to try to add a method to the Eloquent query builder allowing the user to specify additional or modified casts as part of the query, just like eager loading or fetching a related count. Such a feature must only affect the current query, must have no negative performance implications, and most importantly, must be succinct and easy to reason about. With the change affecting such a core part of the framework, a huge sprawling change would (quite rightly) be unlikely to be considered, especially from a first-time contributor.

## The solution

As a testament to how easy Laravel is to work with, the feature was implemented in a grand total of [4 lines of code](https://github.com/laravel/framework/pull/31102/files), not counting the method definitions (for comparison, the corresponding tests outweigh the feature itself by about 4:1).

`$casts` itself is a protected property, so we can’t modify that directly. The solution here was to add a new public method to the `HasAttributes` trait, where the existing cast functionality is defined. The new `mergeCasts` method does as described; allows us to merge a given array of casts with any existing casts on the model. Thanks to how `array_merge` works, this allows us to replace existing casts and define any new ones at the same time.

From there we can add a `withCasts` method to the query builder (named in line with `with`, `withCount`, etc.). This simply calls `mergeCasts` on the internal model instance every Eloquent query builder points to.

Finally, for each record in the query result, the model’s `newInstance` method is called. This sets the raw attributes, as well as things like the database connection. Because attribute casting is not performed until _after_ this step, we need to ensure that each new model instance uses our altered `$casts` array. So we call `mergeCasts` again (on the new instance this time) to keep everything inline with the casts set via the builder.

And that’s all there is to it! The feature was merged in (my first open-source contribution!), and as of Laravel 7 you can specify any casts you like at the query level:

```php
User::query()
    ->select([
        'users.*',
        'last_posted_at' => Post::query()
            ->selectRaw('MAX(created_at)')
            ->whereColumn('user_id', 'users.id')
    ])
    ->withCasts(['last_posted_at' => 'date'])
    ->get();
```

As an added bonus, because it just uses the cast functionality that already existed in the framework, it works nicely with the [custom cast types feature](https://github.com/laravel/framework/pull/31035) that was also added in Laravel 7.
