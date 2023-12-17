# Eps 1: The Eyecatcher

This directory contains a tiny [sromcrom](https://github.com/city41/sromcrom) based project for making the custom eyecatcher in the video.

## How to make the eyecatcher

### Prereqs

I have only done this on Linux. It will likely work as-is on MacOS, and need tweaking on Windows. It will probably work ok on Windows using WSL

- Node, 18 or higher
- Yarn

### Create a rom folder

It should contain

- neogeo.zip: a neo geo bios usable with MAME
- puzzledp.zip's files all extracted out

### Make sure you have MAME and zip installed

You should have vanilla MAME installed, such that `mame` on the command line starts it. The project does `mame -w -nofilter -nomouse puzzledp`

You also need `zip` installed. The projedt does `zip puzzledp.zip *.?? *.bin`

### edit package.json

In package.json, the `mame` script takes the built puzzledp.zip file and copies into the MAME rom directory. Update that rom directory to match your computer.

### Install deps

`yarn install`

### build the eyecatcher

Customize the graphics such as `companyLogo.png` to be whatever you want. Ideally following the palette.

`yarn sromcrom -i resources.json`

The resulting rom files will be in the `rom/` folder

You can..

- View them in the [sprite viewer](https://neospriteviewer.mattgreer.dev/)
- run `yarn zip` to pack them up into `puzzledp.zip`
- run `yarn mame` to pack them up then run the "game" in MAME
