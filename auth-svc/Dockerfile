FROM rust:alpine AS builder

RUN apk add --no-cache musl-dev

WORKDIR /app

COPY . .

RUN cargo build --release


FROM alpine:3.20

RUN apk add --no-cache ca-certificates

RUN addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser

WORKDIR /app

COPY --from=builder /app/target/release/auth-svc /app/auth-svc

# COPY --from=builder /app/migrations /app/migrations

RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 8080

CMD ["/app/auth-svc"]
