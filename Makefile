PORT ?= 8008
HOST ?= 127.0.0.1

.PHONY: help serve check

help:
	@printf "Virtual Soundforge\n\n"
	@printf "Targets:\n"
	@printf "  make serve        Start a local dev server on http://$(HOST):$(PORT)\n"
	@printf "  make check        Run syntax checks for the active app modules\n"
	@printf "\n"
	@printf "Overrides:\n"
	@printf "  make serve PORT=9000 HOST=0.0.0.0\n"

serve:
	python3 -m http.server $(PORT) --bind $(HOST)

check:
	@set -eu; find src -type f -name '*.js' | sort | while IFS= read -r file; do \
		printf 'Checking %s\n' "$$file"; \
		node --input-type=module --check < "$$file"; \
	done
