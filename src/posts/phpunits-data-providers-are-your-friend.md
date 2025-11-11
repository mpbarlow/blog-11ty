---
date: "2024-01-30T21:48:34Z"
title: "PHPUnit’s Data Providers are your friend"
description: "An introduction to PHPUnit Data Providers and the benefits they…provide"
post_tags:
  - testing
  - programming
  - php
  - phpunit
---

For a while after I got serious about good test coverage, my tests would often end up quite sprawling, usually with only one assertion of any real value per test case.

Since I started to lean more into PHPUnit’s [Data Providers](https://phpunit.de/manual/3.7/en/writing-tests-for-phpunit.html#writing-tests-for-phpunit.data-providers), my tests have become much simpler, and as a result easier to read, review, and maintain. Writing tests is usually not the hardest part of development of course, but I believe that reducing friction as much as possible naturally leads to better tests with more coverage.

As a toy example, let’s say I’ve configured a route in a Laravel app to allow listing a new product in an e-commerce system. That route has validation that looks like this:

```php
class CreateProductFormRequest extends FormRequest
{
    public function rules()
    {
        return [
            'name' => ['required'],
            'price' => ['required', 'numeric', 'min:0'],
            'description' => ['sometimes', 'required', 'min:50'],
        ];
    }
}
```

It’s probably quite clear from the rule names, but just to clarify for anyone unfamiliar with validation in Laravel:

- A product name must be included in the request
- A price is required, must be a number or numeric string, and may not be less than zero
- A description is optional, but if included must be at least 50 characters long

## Without a Data Provider

In the past, I might have tested that this endpoint accepts what it should, and doesn’t accept what it shouldn’t, with a sprawling set of test cases like this:

```php
class ProductControllerTest extends TestCase
{
    /** @test */
    public function it_requires_a_name()
    {
        $this
            ->post(route('products.store'), [
                'name' => '',
                'price' => 1.23
            ])
            ->assertInvalid(['name']);
    }

    /** @test */
    public function it_requires_a_price()
    { /* … */ }

    /** @test */
    public function it_does_not_allow_a_negative_price()
    { /* … */ }

    /** @test */
    public function it_allows_description_to_be_omitted()
    { /* … */ }

    /** @test */
    public function it_requires_a_50_char_description_if_present()
    { /* … */ }

    /** @test */
    public function it_passes_validation_when_conditions_are_met()
    {
        $this
            ->post(route('products.store'), [
                'name' => 'product name',
                'description' => \Str::random(100),
                'price' => 1.23
            ])
            ->assertSuccessful();
    }
}
```

Here we have a series of test cases that make a request to our endpoint with a particular request body, and assert either a success response, or validation failures for specific keys. Having tests is almost always better than not, but there are numerous issues here, many immediately apparent.

For a start, despite the validation requirements being about as basic as anything you might see in a real app, the number of test cases and lines of code is already getting a bit unweildy.

Secondly, while the cases I’ve included example code for test _a_ success or failure, there are numerous edge cases that aren’t covered. For example, what if we have an SPA that calls this route and submits JSON where `name` is `null` rather than an empty string, or a bugged form that omits the `name` field entirely? We could (and should!) include these, but the “one assertion per case” model tends to lead to a lot of copy-pasting, creating a wall of tests which will leave reviewers bleary-eyed.

## With a Data Provider

Data Providers solve both of these problems nicely. A Data Provider is just a method that returns either an array of arrays, or yields a sequence of arrays. The outer array is effectively a list of test cases, while the inner arrays are the arguments passed to each case:

```php
class ProductControllerTest extends TestCase
{
    /**
     * @test
     * @dataProvider createProductProvider
     */
    public function it_validates_as_expected(
        array $input,
        array $expectedErrors,
    ) {
        $response = $this->post(route('products.store'), $input);

        if (count($expectedErrors) > 0) {
            $response->assertInvalid($expectedErrors);
        } else {
            $response->assertSuccessful();
        }
    }

    public function createProductProvider(): array
    {
        // Request input, expected validation errors
        return [
            'empty string name' => [
                ['name' => '', 'price' => 1.23],
                ['name'],
            ],
            'null name' => [
                ['name' => null, 'price' => 1.23],
                ['name'],
            ],
            'missing name' => [
                ['price' => 1.23],
                ['name'],
            ],
            'non-numeric price' => [
                ['price' => 'foo', 'name' => 'foo'],
                ['price'],
            ],
            'missing price' => [
                ['name' => 'foo'],
                ['price'],
            ],
            'price < 0' => [
                ['price' => -1.23, 'name' => 'foo'],
                ['price'],
            ],
            'price exactly 0' => [
                ['price' => 0, 'name' => 'foo'],
                [],
            ],
            'no description' => [
                ['name' => 'foo', 'price' => 1.23],
                [],
            ],
            'description < 50 chars' => [
                ['name' => 'foo', 'price' => 1.23, 'description' => 'bar'],
                ['description'],
            ]
            /* etc. etc. */
        ];
    }
}
```

All we need to do is implement a public method that returns our data sets in the proper structure, accept the data as arguments to our test case, and wire it all up using the `@dataProvider` docblock tag.

Now, we only need to write the common logic—making the request and relevant assertions—once, and can cram in as many different permutations of data as we feel are beneficial for the code under test. Adding a new data set is as simple as adding a new entry to the array, which in my experience leads to much wider behaviour coverage, because it makes it so much less onerous to cover all your bases.

While this example looks just as long as the previous one, what’s being tested is so much less to mentally parse than multiple tests would be (plus I’ve split my arrays over multiple lines because I’m limited on width here 😁). You could also condense several of my example data sets into a single one, but I wanted to highlight how easy it becomes to make sure everything is covered.

## Structuring your refactored cases

It’s not required to label the data sets (e.g. `'price < 0'`), but it’s strongly recommended that you do, for two reasons. First, it makes it clear what you’re intending to test, which will assist reviewers and, undoubtedly, future-you. Secondly, if a test does fail, PHPUnit will print out the data set name in the error message, rather than a vague `data set #3`. I also like to include a brief comment noting the structure of the values as a bit of additional context, but this is just a personal preference of mine.

Some might say that conditionally asserting success or failure is a bad idea, as you risk introducing logic errors into the _test_ that could hide real problems with your application. Personally I find the “if expect-error then specific-failure, else success” pattern to be simple and low risk, but I can totally see the argument. You might instead opt to split your expected successes and failures into two separate test cases with two Data Providers.

## A note on model factories

My examples above are based around Laravel, but if you try to use framework features like model factories in Data Providers, you’re likely to run into somewhat cryptic errors about facade roots, because the Provider runs before the framework boots. Greg Mayes has an [excellent post on how to solve this](https://www.gregmayes.dev/posts/2024/02/03/using-laravel-model-factories-in-phpunit-data-providers/) by wrapping the data in closures to delay execution.

And that’s really all there is to it! Data Providers aren’t a complex feature to use, but they can be a huge help in making tests with many permutations a lot more pleasant to write.
