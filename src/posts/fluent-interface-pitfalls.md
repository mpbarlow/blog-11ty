---
date: "2024-02-08T21:34:46Z"
title: "Fluent interface pitfalls"
post_tags:
  - fp
  - oop
  - testing
  - programming
  - php
---

## Background

Fluent interfaces are very common in the PHP world, as well as many other object-oriented languages. They can provide a very nice way to interface with classes, but they’re often misused—completely accidentally.

For those not familiar with the term, it’s literally just when methods on an object return the object itself (or, more rarely, a copy) to support method chaining. Configuration is performed in steps, forming a pseudo-DSL that reads nicely and has the potential to be very flexible. It also looks slick, which shouldn’t be a factor, but I think often is.

Here’s an example. This class performs a file upload to some abstracted filesystem (for example a local disk or S3), with optional logging. Realistically, you probably wouldn’t need a dedicated class for this, but let’s imagine there’s enough additional business logic required that would warrant it.

```php
class Uploader
{
    protected ?LoggerInterface $logger = null;
    protected FilesystemInterface $disk;

    public function withLogging(LoggerInterface $logger): static
    {
        $this->logger = $logger;
        return $this;
    }

    public function toDisk(FilesystemInterface $disk): static
    {
        $this->disk = $disk;
        return $this;
    }

    public function upload(string $filename, string $data): static
    {
        $this->logger?->info("Uploading {$filename}");

        // Perform some business logic...

        $this->disk->put($filename, $data);

        $this->logger?->info("Uploaded {$filename}");

        return $this;
    }
}

(new Uploader)
    ->withLogging($logger)
    ->toDisk($disk)
    ->upload("hello.txt", "Hello, world!")
    ->upload("howdy.txt", "Me again");
```

At first glance this is pretty nice. It reads imperatively, which makes it very simple to understand, and because the configuration is done in stages, it would be easy to wrap parts in conditionals to set things up a little differently if we need to. We can also chain as many files as we like.

It’s a somewhat contrived example, but it’s a common pattern you are likely to see in real codebases. We have a problem though.

## Partial construction

We have correctly modelled the fact that logging is optional by making `$logger` nullable and by using the null-safe operator when attempting to call methods on it. If the consumer of our class has no interest in logging, they need not even be aware that the class is capable of it.

However, the _raison d’être_ of this class is to write a file to a disk. The disk is a mandatory dependency; calling `upload()` without one set is nonsense, and will quite rightly crash if you try. But, in the way this is modelled, it isn’t mandatory at all: the object is in an invalid, incomplete state until the moment the consumer calls `toDisk()`.

You could add a check to throw an exception up-front if no disk is set, but this solves almost nothing—the consumer is still forced to understand implementation details of the class in order to use it, making it quite the leaky abstraction.

One of the most powerful ways to reduce both runtime bugs and “code-time” mental load is to [make invalid states unrepresentable](https://kevinmahoney.co.uk/articles/my-principles-for-building-software/#make-invalid-states-unrepresentable). Put simply, this is where you make nonsense situations like the above impossible, such that you don’t need to worry about guarding against them. It’s not always easy with the runtime-only nature of PHP’s type system, but by putting some thought into the design of your classes, you can almost always avoid it.

The fix here is really simple: scrap `toDisk()`, and make `$disk` a non-nullable parameter to `Uploader`’s constructor. Not only does this make the dependency between `Uploader` and `FilesystemInterface` crystal clear to consumers, but it also makes it impossible to even instantiate the class without everything it needs to perform its functions.

If your class has multiple methods that each require different dependencies, you might instead opt to pass them to the individual methods. This ultimately has the same effect, though more than a couple and it’s worth asking yourself if the class has too many concerns and should be broken up.

The key point here is that fluent interfaces should only be used for configuration, not construction. If your code can’t work without it, it shouldn’t be possible to _not_ provide it.

Even classes that take method chaining to an extreme can be designed in such a way that the object is never left in an invalid state. For example, you can call `get()` on a completely naked [Eloquent query builder](https://laravel.com/docs/10.x/queries), and the result is perfectly valid and logical (it just runs a `SELECT * FROM <table>`).

## Digital Febreeze

Another case where fluent interfaces can cause unintended problems is their ability to hide code smells, particularly for methods with too many responsibilities.

```php
class Example
{
    public function amendAccount(
        string $accountRef,
        int $amount,
        bool $recalculateBefore = false,
        bool $notifyHolders = false,
        ?LoggerInterface $logger = null,
        ?AccountService $overrideHandler = null,
        ?MailerInterface $mailer = null,
    ): void {
        // ...
    }
}

(new Example)->amendAccount(
    "northlight",
    42,
    null,
    null,
    new Logger,
    null,
    new Mailer,
);
```

It’s context-dependent of course, but seeing something like the code above is quite likely to set off your developer-spidey-sense right away. Seven parameters, lots of flags and overrides, and a bunch of them are optional? That has all the hallmarks of a method that’s had tons of stuff bolted onto it, and has come to do far too much over time.

But would you raise an eyebrow seeing this instead?

```php
class Example
{
    public function withLogging(LoggerInterface $logger): static
    { /* ... */ }

    // More setters for each optional parameter...

    public function amendAccount(
        string $accountRef,
        int $amount,
    ): void { /* ... */ }
}

(new Example)
    ->withLogging(new Logger)
    ->sendMailVia(new Mailer)
    ->amendAccount("northlight", 42);
```

I’m not sure I would unless I had a reason to dig into the implementation. There are hints—for example exposing tons of setter methods of questionable relevance—but it’s far less obvious because the optional dependencies are omitted implicitly.

And yet, there is no difference! Plus or minus a few cases of `$this`, the implementation of `amendAccount()` could be identical between both examples. We have not addressed the source of the smell; we’ve just masked it with something superficially more pleasant.

Unlike the previous point, I don’t think there’s an easy rule to follow here. After all, the main benefit of fluent interfaces is make configuration less onerous and more legible. However, I think it goes to show that adding a fluent interface is something that should be carefully considered, because they can easily mask [accidental complexity](http://worrydream.com/refs/Brooks-NoSilverBullet.pdf)—especially as a unit of code grows over time.

## Testing

Testing a class that uses a fluent interface isn’t so bad; testing a class whose _dependencies_ use fluent interfaces is a pain in the arse.

This is because you have to mock out the expectations for each individual method in the chain. Not only does this add extra boilerplate, but such expectations are typically more brittle because the nature and order of configuration methods are far more likely to change than the final call to the method that actually does something.

There are some quality-of-life options such as [Mockery’s support for chained expectations](https://docs.mockery.io/en/latest/reference/demeter_chains.html), but string-typing is never good (they’re unlikely to be picked up by any IDE refactoring you might do, for a start) and they’re still subject to brittleness around ordering.

## The state of things

It’s not something you see discussed all that much because it’s a functional concern about an extremely object-oriented design pattern, but fluent interfaces also tend to lead to a lot of mutable state. Typically each call in the chain will modify the object in place before returning it. It doesn’t _have_ to work this way—in the first example above, you could return a brand new `Uploader` with a logger set, then a further new instance with both the logger and the disk set—but this is not often done and, in languages like PHP where immutability is not a core feature, can be awkward and costly to performance.

At a theory level, the problem with mutable state is the explosion of possible combinations your code can be in as more and more moving pieces are added—I think it’s safe to say we’ve all had [Pepe Silvia](https://www.youtube.com/watch?v=1NBfZcNU4O0) moments trying to work out the exact sequence of events that caused a bug we didn’t think was possible.

At a practical level, it means you have to be incredibly careful when passing around and reusing highly stateful objects, because changes you make in one place will carry through to subsequent calls. If you write PHP, how many times have you accidentally mutated a regular `DateTime` when trying to create a new date relative to an existing one? More than once I bet!

As I said, I’m probably barking up the wrong tree; object-oriented languages are not functional languages and nor should they be. But it’s a valid concern, and one I think fluent interfaces can exacerbate.

Fluent interfaces are not inherently bad, and when the DSL they form closely matches the natural model of a problem (query builders!) they can be very pleasant to work with. But, as with many things in the OOP world, it’s important to be aware of the pitfalls when considering their use.
