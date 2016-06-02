REPORTER = Spec

test:
	./node_modules/.bin/mocha  --reporter $(REPORTER)
.PHONY: test
coverage:
	istanbul cover _mocha -- -R spec
	@echo
	@echo open coverage/lcov-report/index.html file in your browser
.PHONY: coverage
