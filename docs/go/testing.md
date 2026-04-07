<!-- Source: https://go.dev/blog/subtests -->
# Using Subtests and Sub-benchmarks

**Author:** Marcel van Lohuizen
**Date:** 3 October 2016

## Introduction

Go 1.7 introduced the `Run` method on the `T` and `B` types in the `testing` package, enabling the creation of subtests and sub-benchmarks. These features provide:

- Better handling of failures
- Fine-grained control of which tests to run from the command line
- Control of parallelism
- Simpler and more maintainable code

## Table-Driven Tests Basics

A common Go testing pattern is looping over a slice of test cases:

```go
func TestTime(t *testing.T) {
    testCases := []struct {
        gmt  string
        loc  string
        want string
    }{
        {"12:31", "Europe/Zuri", "13:31"},     // incorrect location name
        {"12:31", "America/New_York", "7:31"}, // should be 07:31
        {"08:08", "Australia/Sydney", "18:08"},
    }
    for _, tc := range testCases {
        loc, err := time.LoadLocation(tc.loc)
        if err != nil {
            t.Fatalf("could not load location %q", tc.loc)
        }
        gmt, _ := time.Parse("15:04", tc.gmt)
        if got := gmt.In(loc).Format("15:04"); got != tc.want {
            t.Errorf("In(%s, %s) = %s; want %s", tc.gmt, tc.loc, got, tc.want)
        }
    }
}
```

This table-driven approach reduces repetitive code and makes it easy to add test cases.

## Table-Driven Benchmarks

Before Go 1.7, benchmarks couldn't use the table-driven approach effectively. The common workaround was defining separate top-level benchmarks:

```go
func benchmarkAppendFloat(b *testing.B, f float64, fmt byte, prec, bitSize int) {
    dst := make([]byte, 30)
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        AppendFloat(dst[:0], f, fmt, prec, bitSize)
    }
}

func BenchmarkAppendFloatDecimal(b *testing.B) { benchmarkAppendFloat(b, 33909, 'g', -1, 64) }
func BenchmarkAppendFloat(b *testing.B)        { benchmarkAppendFloat(b, 339.7784, 'g', -1, 64) }
func BenchmarkAppendFloatExp(b *testing.B)     { benchmarkAppendFloat(b, -5.09e75, 'g', -1, 64) }
func BenchmarkAppendFloatNegExp(b *testing.B)  { benchmarkAppendFloat(b, -5.11e-95, 'g', -1, 64) }
func BenchmarkAppendFloatBig(b *testing.B)     { benchmarkAppendFloat(b, 123456789123456789123456789, 'g', -1, 64) }
```

With Go 1.7, the same benchmarks can be expressed using `Run`:

```go
func BenchmarkAppendFloat(b *testing.B) {
    benchmarks := []struct{
        name    string
        float   float64
        fmt     byte
        prec    int
        bitSize int
    }{
        {"Decimal", 33909, 'g', -1, 64},
        {"Float", 339.7784, 'g', -1, 64},
        {"Exp", -5.09e75, 'g', -1, 64},
        {"NegExp", -5.11e-95, 'g', -1, 64},
        {"Big", 123456789123456789123456789, 'g', -1, 64},
    }
    dst := make([]byte, 30)
    for _, bm := range benchmarks {
        b.Run(bm.name, func(b *testing.B) {
            for i := 0; i < b.N; i++ {
                AppendFloat(dst[:0], bm.float, bm.fmt, bm.prec, bm.bitSize)
            }
        })
    }
}
```

The enclosing benchmark function runs only once and is not measured.

## Table-Driven Tests Using Subtests

Using subtests with the `Run` method:

```go
func TestTime(t *testing.T) {
    testCases := []struct {
        gmt  string
        loc  string
        want string
    }{
        {"12:31", "Europe/Zuri", "13:31"},
        {"12:31", "America/New_York", "7:31"},
        {"08:08", "Australia/Sydney", "18:08"},
    }
    for _, tc := range testCases {
        t.Run(fmt.Sprintf("%s in %s", tc.gmt, tc.loc), func(t *testing.T) {
            loc, err := time.LoadLocation(tc.loc)
            if err != nil {
                t.Fatal("could not load location")
            }
            gmt, _ := time.Parse("15:04", tc.gmt)
            if got := gmt.In(loc).Format("15:04"); got != tc.want {
                t.Errorf("got %s; want %s", got, tc.want)
            }
        })
    }
}
```

**Key differences:**

- **Failure handling:** `Fatal` and siblings cause a subtest to be skipped but not its parent or subsequent subtests
- **Error messages:** Can be shorter since the subtest name uniquely identifies the test
- **Output:** Shows hierarchical structure with all failures reported

Output example:
```
--- FAIL: TestTime (0.00s)
    --- FAIL: TestTime/12:31_in_Europe/Zuri (0.00s)
        time_test.go:84: could not load location
    --- FAIL: TestTime/12:31_in_America/New_York (0.00s)
        time_test.go:88: got 07:31; want 7:31
```

## Running Specific Tests or Benchmarks

Use the `-run` or `-bench` flags with slash-separated regular expressions:

```bash
# Run tests that use a timezone in Europe
$ go test -run=TestTime/"in Europe"

# Run only tests for times after noon
$ go test -run=Time/12:[0-9] -v

# Run tests for a specific location (note the double slash)
$ go test -run=Time//New_York
```

**Name handling:**
- Names are sanitized (spaces become underscores, non-printable characters escaped)
- The full name is a slash-separated list of the function name and all parent `Run` names
- Slashes in names are treated as separators, so escape them if needed
- A unique sequence number is appended to non-unique test names

## Setup and Tear-down

Subtests can manage common setup and tear-down code:

```go
func TestFoo(t *testing.T) {
    // <setup code>
    t.Run("A=1", func(t *testing.T) { ... })
    t.Run("A=2", func(t *testing.T) { ... })
    t.Run("B=1", func(t *testing.T) {
        if !test(foo{B:1}) {
            t.Fail()
        }
    })
    // <tear-down code>
}
```

The setup and tear-down code runs once if any enclosed subtests run, regardless of `Skip`, `Fail`, or `Fatal` calls.

## Control of Parallelism

### Key Semantics

- A **parallel test** calls `Parallel()` on its `testing.T` instance
- Parallel tests never run concurrently with sequential tests
- A test blocks until its function returns and all subtests complete
- The `-parallel` flag defines the maximum number of concurrent parallel tests

### Run a Group of Tests in Parallel

```go
func TestGroupedParallel(t *testing.T) {
    for _, tc := range testCases {
        tc := tc // capture range variable
        t.Run(tc.Name, func(t *testing.T) {
            t.Parallel()
            if got := foo(tc.in); got != tc.out {
                t.Errorf("got %v; want %v", got, tc.out)
            }
        })
    }
}
```

The outer test doesn't complete until all parallel subtests finish, preventing other parallel tests from running concurrently.

### Cleanup After Parallel Tests

```go
func TestTeardownParallel(t *testing.T) {
    // <setup code>
    t.Run("group", func(t *testing.T) {
        t.Run("Test1", parallelTest1)
        t.Run("Test2", parallelTest2)
        t.Run("Test3", parallelTest3)
    })
    // <tear-down code>
}
```

The outer test waits for all parallel subtests to complete before executing tear-down code.

## Conclusion

Go 1.7's subtests and sub-benchmarks enable:

- **Structured testing:** Extends the package-level test hierarchy to individual tests recursively
- **Fine-grained execution:** Run specific test cases with command-line filters
- **Shared resources:** Manage setup/teardown across groups of tests
- **Parallelism control:** Fine-grained control over test execution concurrency

These features integrate naturally into existing Go testing tools while providing more expressive and maintainable test structures.
