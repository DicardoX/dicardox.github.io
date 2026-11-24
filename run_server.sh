#!/bin/bash
# Local preview of the site.
#
# Preferred path: bundler (bundle exec jekyll liveserve, with live reload via
# the hawkins gem). This needs a Ruby toolchain that can install Gemfile.lock,
# which the macOS system Ruby 2.6 currently cannot (ffi/eventmachine fail to
# compile), so we fall back to the standalone gems installed in the user gem
# directory (~/.gem/ruby/2.6.0): plain `jekyll serve`, no live reload.

if bundle exec jekyll --version >/dev/null 2>&1; then
  exec bundle exec jekyll liveserve
fi

export GEM_HOME="$(ruby -e 'puts Gem.user_dir')"
export PATH="$GEM_HOME/bin:$PATH"
exec env JEKYLL_NO_BUNDLER_REQUIRE=true jekyll serve
