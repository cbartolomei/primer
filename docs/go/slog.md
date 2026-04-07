<!-- Source: https://go.dev/blog/slog -->
# Structured Logging with slog

**Author:** Jonathan Amsterdam
**Date:** 22 August 2023

## Overview

The new `log/slog` package in Go 1.21 brings structured logging to the standard library. Structured logs use key-value pairs for parsing, filtering, searching, and analyzing. While the Go ecosystem had many structured logging packages (like logrus, used in over 100,000 packages), `slog` provides a common framework for interoperability.

## A Tour of `slog`

### Basic Usage

The simplest program:

```go
package main

import "log/slog"

func main() {
    slog.Info("hello, world")
}
```

Output:
```
2023/08/04 16:09:19 INFO hello, world
```

### Log Levels

Available functions: `Debug`, `Info`, `Warn`, `Error`, and a general `Log` function. Levels are integers (e.g., Info is 0, Warn is 4), allowing custom levels.

### Key-Value Pairs

```go
slog.Info("hello, world", "user", os.Getenv("USER"))
```

Output:
```
2023/08/04 16:27:19 INFO hello, world user=jba
```

### Handlers

**TextHandler** - Key=value format:

```go
logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
logger.Info("hello, world", "user", os.Getenv("USER"))
```

Output:
```
time=2023-08-04T16:56:03.786-04:00 level=INFO msg="hello, world" user=jba
```

**JSONHandler** - JSON format:

```go
logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
logger.Info("hello, world", "user", os.Getenv("USER"))
```

Output:
```json
{"time":"2023-08-04T16:58:02.939245411-04:00","level":"INFO","msg":"hello, world","user":"jba"}
```

### Advanced Features

**LogAttrs** - More efficient for frequent logging:

```go
slog.LogAttrs(context.Background(), slog.LevelInfo, "hello, world",
    slog.String("user", os.Getenv("USER")))
```

**Logger.With** - Add attributes to all output:

```go
logger := logger.With("user", os.Getenv("USER"))
logger.Info("message")
```

**Additional capabilities:**
- Pass `context.Context` for trace IDs and context information
- Combine attributes into groups for structure
- Implement `LogValue` method to customize value appearance (redacting sensitive data, grouping struct fields)

## Performance

Key optimizations:

- **`Enabled` method** - Handlers can drop unwanted log events quickly
- **`WithAttrs` and `WithGroup` methods** - Pre-format attributes to avoid repeated formatting
- **Memory allocation focus** - Over 95% of logging calls use 5 or fewer attributes

## Design Process

### Timeline

- **April 2022** - Go team decides to explore structured logging for stdlib
- **August 2022** - Initial design finalized; experimental implementation published
- **August 29, 2022** - Public GitHub discussion begins
- **October 2022** - Formal proposal submitted (800+ comments)
- **March 15, 2023** - Proposal accepted
- **August 8, 2023** - Go 1.21 released with `slog`

### Design Decisions

**Context and Logging:**
1. Rejected adding loggers to context (too implicit)
2. Created two method sets: with and without context

**Alternating Key-Value Syntax:**
- Controversial but kept for simplicity and consistency with existing packages (logr, go-kit/log, zap's SugaredLogger)
- Added vet check to catch common mistakes

### Non-Goals

- Not intended to replace existing third-party logging packages
- Design provides `Logger` frontend and `Handler` backend interface for interoperability
- Handlers created/in progress for Zap, logr, and hclog

## Resources

- [Official documentation](https://pkg.go.dev/log/slog)
- [Wiki page](https://go.dev/wiki/Resources-for-slog) with community-provided handlers
- [Handler writing guide](https://github.com/golang/example/blob/master/slog-handler-guide/README.md)
