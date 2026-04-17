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
	node --check src/app/main.js
	node --check src/app/details.js
	node --check src/core/project.js
	node --check src/core/generators/random.js
	node --check src/core/render/simple-synth.js
	node --check src/core/render/live-synth.js
	node --check src/core/render/midi-export.js
