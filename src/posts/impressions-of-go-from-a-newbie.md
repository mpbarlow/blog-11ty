---
date: "2024-01-27T22:52:49Z"
title: "Impressions of Go, from a newbie"
post_tags:
  - go
  - javascript
  - typescript
  - php
  - programming
---

**Disclaimer**: as the title suggests, I’m still new to Go. It’s entirely possible that some of the things I mention in this post may be based on an incomplete understanding, or it might just be that there’s parts of Go I don’t fully appreciate yet. This is simply my initial impressions, now that I’ve worked on a few real-world projects.

For reasons which are entirely uncontroversial and completely understandable, my employer is moving towards TypeScript and Go for new services, having historically used PHP for almost everything on the backend.

Despite its historic association with shoddy code and an infamously inconsistent standard library, PHP today is an excellent tool to power websites and web apps, and you can be incredibly productive just with what the language itself provides. Bring in a full-stack framework like Laravel, and you can build some crazy complex stuff without ever needing additional packages. This post doesn’t have a lot to do with PHP other than the occasional comparison—I just think it deserves a shout out 😁

Anyway, at work we have definitely been guilty of also using PHP for purposes it is not at all well suited for (e.g. long-running processes), which is one force of many driving the change.

<h2>Tooling</h2>

Something that has really stood out to me with Go is the simplicity of the tooling. While I really quite like—and have tremendous respect for—TypeScript as a language, it seems very much bogged down in JavaScript’s insane tooling and ecosystem story.

Putting aside the fact that any medium-sized project using a handful of useful packages is likely to swell to hundreds of transitive dependencies, even the most basic question of “how should I compile my code?” is drowning in options, each with their own tradeoffs.

Should I use the built-in compiler? It’s not very fast, and I immediately ran into an issue where neither my editor or the official documentation wants me to use file extensions for local imports, but Node requires that I do. How about esbuild? Very quick, but after a short while I hit a snag where a package I was using `require`d something internally which made it throw up errors. Answers online suggested hooking into the build process to insert additional code to dynamically create a `require` function which…no thanks. Another team suggested webpack, but I still have PTSD from when my job involved front-end work.

These are all easily solvable problems I’m sure, but having half a dozen StackOverflow threads open 15 minutes after running `git init` does not give a good impression.

What about testing? Jest seems to be what the cool kids are using these days, so let’s install that. Ah, but I need to support TypeScript, and again I’m faced with at least two choices for how I compile my TypeScript for the test runner, and two further, entirely different choices for how I get type definitions for my editor and the type checker.

At least Prettier has a good story for automatic formatting: yes it’s another thing to install, but it’ll produce a good result out of the box without needing to configure anything or make any decisions.

This is in no way meant to be a hit piece on the Node ecosystem, but it does serve as a very illustrative example:

- How do I compile my Go code? `go build <path>`
- How do I test my Go code? `go test <path>`
- How do I format my Go code? `go fmt <path>`

I realise these sorts of things largely sink into the background once a project is established, but providing the essentials out of the box so I can just get on with building stuff is something I find tremendously valuable.

<h2>Language</h2>

Overall, I’ve found Go pleasant to write, though somewhat inexpressive. While it feels clunky that something as common as declaring a variable with one of two initial values is a multi-line operation, I can’t help but respect the almost militant disdain of attempts to be clever. That sounds like a thinly-veiled criticism, but I really do mean it as a compliment: by forcing everything to be written plainly, Go is very readable. I found myself comfortable scanning through a medium-sized codebase within a couple of hours of first starting to look at the language. There are few tricks and little magic, and despite a couple of footguns when _writing_ Go, reading it has been delightfully straightforward so far.

I still think the lack of a ternary operator is a mistake though; especially when nested ternaries—which appear to be the primary rationale behind its omission—could be easily forbidden via linting or code review. I guess you could implement it as a function if you really wanted to.

<h3>Type system and conventions</h3>

I often found myself wishing for more modern affordances in the type system, like sum types—particularly with regard to how optionality is modelled (or isn’t). I realise that might sound odd from someone who’s spent most of his career writing PHP, but at least in PHP `T` and `?T` (“nullable `T`”) are distinct types, and that distinction applies to both value and reference types equally. This alone is surprisingly powerful for avoiding a whole class of errors, at least assuming you’re using a static analyser or a half-decent editor—PHP itself of course has no compilation stage to catch type errors before runtime.

The most common way to represent optionality in Go is to either use a pointer, or to rely always having a zero-value if you don’t specify otherwise. Which I guess are the same thing, given a pointer’s zero-value is `nil`. I don’t find either of these particularly compelling solutions to modelling data that is permitted to have no value.

Using a pointer muddles the semantics; am I passing a pointer because I want the function to be able to change the value, for performance reasons, or because it might be `nil`? Conversely, Go has no type-level mechanism to enforce that a pointer I receive or return will _not_ be `nil`. As for zero-values, they are, at least in the contexts I work, almost always a non-starter. There are simply too many cases where the zero-value is also a valid value in the model, but where I still need to discern between “no value” and “zero”.

Granted, now that Go has generics, creating your own `Optional[T]` type is trivial, but not being part of the standard library limits the effectiveness of doing so, as there’s no common, shared implementation that all code uses by default. The lack of sum types also precludes any protections against attempting to unwrap a value which doesn’t exist. Compare this to Swift’s `Optional<T>`: you can be certain that every single piece of Swift code—first- or third-party—will use it to model optionality, and the semantics of enums in Swift force you both to check there is a value before using it, and to handle the case where there isn’t. (Yes, I know Swift has `!` to force-unwrap an optional, but this is largely in service of the mountain of existing Objective-C libraries from Apple that do not have those guarantees.)

In the same class as optionals are result types. If you’re not familiar, as `Optional<T>` models that the function returns a value of type `T` _or_ nothing, `Result<T, Error>` models a value _or_ an error. Go’s first-class support for multiple return values is nice, but the convention of `func Foo() (T, error)` is just that: a convention. An incredibly strong one, sure, but the language does little to prevent me accidentally doing something stupid when faced with an error. Humans are endlessly fallible, but smart people have designed good solutions to guard against mistakes this common, so it’s a shame that Go ignores many of them.

Another pitfall with the `(T, error)` return pattern is that, especially if `T` is a value, you’re still getting something “valid” back from the function even when an error occurs. That makes it way easier than it should be to accidentally proceed, and end up failing somewhere down the line in a way you _thought_ was impossible.

On that subject, I’m not sure how I feel about everything being initialised by default. It can certainly be very useful, but I think I’d prefer it if you had to explicitly initialise zero-values with `new(T)`, making uses of uninitialised variables a compile-time error. Much like with return values, having everything be valid right away makes it easier to accidentally continue execution in cases you don’t intend to.

I also find the idea of pointer and value method receivers to also be a little perplexing. Not because I don’t understand them; as the Go FAQ points out, most languages with a concept of methods feature `this` as a reference, rather than a copy. “It is the value receivers in Go that are unusual”, after all.

Rather, I don’t really see what purpose value receivers serve. Yes, they ensure that the method can’t mutate the value it’s called on, but Go has almost no concept of immutability anyway. It’s strongly recommended that receiver types for an interface aren’t mixed, so if you’re the implementer, there’s a good chance you’re going to end up using all pointer receivers even if some methods would be better as values. If you’re the caller, there’s an equally decent chance you’ll be calling the method on an interface type, in which case you don’t, can’t, and by design _shouldn’t_ be able to know which receiver type it is. All said, it makes the applicability of value receivers seem incredibly narrow, and therefore a bit of an odd inclusion. Maybe I’m just missing some killer use case for them.

Anyway, rants over: let’s talk about some really great stuff.

<h3>Dodging inheritance tax</h3>

The use of structural typing and the omission of classical inheritance is a breath of fresh air.

On structural typing, there’s not all that much to say. Whether it’s a Duck or a Mallard is immaterial; I just need something that quacks. Using a language with structural typing makes you wonder why nominal type systems need to make everything so unwieldy. (Credit to TypeScript, which takes this one step further by not even requiring you create a name to cover `quacker`s, by virtue of its inline structural type annotations.)

The flexibility here also makes testing easier. I was recently working on a project using just two methods from the AWS SDK. When writing tests, I could simply tweak my code slightly to replace the concrete `*s3.Client` with an interface `S3Client`, specifying only the methods I was actually using. With that, my mocks needed only to stub those methods, rather than the hundreds in the actual SDK, with no changes needed to any calling code.

As for inheritance: this is my eighth year of developing software professionally, and in that time I’ve come to view inheritance as a leaky abstraction that should be used sparingly, if at all. Some of this arises from personal experience: there is only so many times you can debug some code that depends on a complex web of state and implementation defined across 3+ layers of sub- and super-classes before you lose the will to live.

While it doesn’t inherently _have_ to, in my experience the ability to dynamically weave little bits of internal functionality and tweak it to slightly different ends leads to class hierarchies which are responsible for far too much, which in turns leads to complex and brittle code. Then, when you come to test it, you have a big opaque blob that requires initialising the whole world before making assertions about any individual thing. Or, to say it another way, inheritance doesn’t preclude anyone writing well structured code, but it does make it very tempting to produce something poorly structured in ways that don’t immediately reveal themselves.

Conversely, if you want to add flexibility without inheritance you are forced into composition, and “depth” (the class hierarchy) is transposed into “width” (separating distinct functionality into dependencies that are passed in). This requires you to really think about where responsibility boundaries lie, and ultimately leads to code that is not only easier to test and reason about, but is often significantly _more_ flexible than the inheritance-based equivalent.

Big thumbs up from me.

<h3>Concurrency</h3>

My opinion on this matter isn’t worth a whole lot—you _can_ write concurrent PHP, but it’s about as advisable as templating your website markup with C—but goroutines and channels have been a delight, and with a few simple rules provide a concurrency model that is as powerful as it is easy to use.

I was able to implement a feature that concurrently fetched pages of data from an API while processing multiple results from the current page, with code that was just as simple as it would be if it was synchronous. I never had to worry about cascading function colouring, and it all worked exactly like I expected it to the first time. I’m sure there’s some complexities lurking when things get really complex, but for the case of “I would like to do 20 of this at the same time”, it really couldn’t be easier.

<h2>Conclusion</h2>

When writing this post, at times I felt like I might unfairly be wanting to turn Go into a language it never claimed to be. But on balance, I think my gripes, if addressed in a hypothetical “Go 2”, would not fundamentally change the principles it adheres to. It was built at least in part to be a language in which inexperienced developers could write good software without shooting themselves in the foot, and while it succeeds in many areas, it also ignores many of the advances in type systems and language design from the last 20 years. Hopefully some of these can find their way into the language in an idiomatic way, much as generics have.

That said, it would appear there is a lot more Go in my professional future, and I’m very much not mad about that.

I’d still really like a proper `Optional` and `Result` though.
