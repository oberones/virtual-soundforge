# virtual-soundforge 

## Running locally

To run your own copy of SoundBox locally, you need to serve it via a web server
(using the file:// protocol is *not* supported).

A simple method is to use Python SimpleHTTPServer (that usually comes
preinstalled on Unix-like systems such as macOS and Linux):

```bash
cd path/to/soundbox
python -m http.server 8008
```

Now point your browser to `http://localhost:8008/`.

## License

The SoundBox editor is licensed under the
[GNU General Public License version 3](gpl.txt).

However, the minimal player routine, [player-small.js](player-small.js), is
released under the [zlib/libpng license](https://opensource.org/licenses/Zlib).
This makes it suitable for inclusion in your own software.


## Contributing

You are very welcome to contribute with pull requests. When doing so, follow
these conventions:

### Git commits

* Use [proper commit messages](http://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html),
  in imperative form.
* Let the Git history of your feature branch follow the
  [recipe model](http://www.bitsnbites.eu/git-history-work-log-vs-recipe/).
* If your commit fixes a reported issue, add "Fixes #14" (where "14" is the
  issue number) on a separate line in the commit message (in the body part of
  the comment, *not* in the summary part).

These are simple, conventional practices that make it easier to keep track of
different patches.

* Use spaces for indentation (not tabs).
* The player routine is special - it is designed and tuned for being as small
  and easily compressible (e.g. using [GCC](https://developers.google.com/closure/compiler/)
  and [DEFLATE](https://en.wikipedia.org/wiki/DEFLATE)) as possible. Do not add
  or alter the player routine without careful consideration.

