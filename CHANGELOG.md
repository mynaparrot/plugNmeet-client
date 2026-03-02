# Changelog

## [2.1.5](https://github.com/mynaparrot/plugNmeet-client/compare/v2.1.4...v2.1.5) (2026-03-02)


### Bug Fixes

* because of race-condition same track was publishing multiple times ([82fdcbc](https://github.com/mynaparrot/plugNmeet-client/commit/82fdcbc62ebd12d5ddc4ac28b0309e7ce9326a67))
* bump deps ([ec36279](https://github.com/mynaparrot/plugNmeet-client/commit/ec362790cfc2babb6e96279bf65ac0c9e9385e74))
* configurable option to `fallback_turn` when connection bad ([5870443](https://github.com/mynaparrot/plugNmeet-client/commit/58704439489c3d3ff2728bbb11e8f4fd79f702f4))
* deps upgrade ([5222420](https://github.com/mynaparrot/plugNmeet-client/commit/5222420d24136cea40636ac1af78fdd417274d66))
* disable `relay` for mobile firefox for the moment. ([76def67](https://github.com/mynaparrot/plugNmeet-client/commit/76def67f03b594c9a29ef4416300f2f33451f302))
* don't process for firefox mobile for the moment ([3edf0bc](https://github.com/mynaparrot/plugNmeet-client/commit/3edf0bcb3587759ff1f951749a2c996988032deb))
* **feat:** option to configure custom turn servers ([278923c](https://github.com/mynaparrot/plugNmeet-client/commit/278923cdd1af0c55d969c2ac93eb75873aa35a7d))
* **feat:** option to configure custom turn servers ([034aeae](https://github.com/mynaparrot/plugNmeet-client/commit/034aeae0de6b1a6769157241e9b37badaf2b7a19))
* nats connection tag name ([38aec54](https://github.com/mynaparrot/plugNmeet-client/commit/38aec54320b9757347558ca1a1a21d701a50868c))
* new Crowdin updates ([3b84db6](https://github.com/mynaparrot/plugNmeet-client/commit/3b84db6d65f5cd059357ae653a29658805ed8fc9))
* option to configure `enableAdaptiveStream` ([6b71b25](https://github.com/mynaparrot/plugNmeet-client/commit/6b71b2546160a7d87a9250739bcd326624c9ca5c))
* option to set `fallbackTimerDuration` in server config ([81fb2f1](https://github.com/mynaparrot/plugNmeet-client/commit/81fb2f1309a7e1038f5d7ea78dc263dee22ae093))
* prevent duplicate click while sharing screen task in progress ([6de8fac](https://github.com/mynaparrot/plugNmeet-client/commit/6de8faccb6a71e2323d03d0c3e9f345f376d3e8a))
* trying to send message when nats disconnected ([779a77f](https://github.com/mynaparrot/plugNmeet-client/commit/779a77f5899a0401abb2fcb97a192eb7d0e39ed2))
* use Map for O(1) lookups ([e8beebf](https://github.com/mynaparrot/plugNmeet-client/commit/e8beebf73228dfe64b9659ddcf8013f33c02f2e9))
* use timer to execute fallback ([d6857db](https://github.com/mynaparrot/plugNmeet-client/commit/d6857db46f680ec1ff7bfffde62c46fb7421f945))
* video participant race condition upon ws disconnection ([1eccebf](https://github.com/mynaparrot/plugNmeet-client/commit/1eccebf71e419dd7be19be27fb0c2222d67fb92e))
* video participant race condition upon ws disconnection ([439f8af](https://github.com/mynaparrot/plugNmeet-client/commit/439f8af1882fd782f786d0035e2ad7263a2ce076))
* webcam toggle was loosing virtual background ([882b561](https://github.com/mynaparrot/plugNmeet-client/commit/882b561154cbc8b0b4ba1ab45c6a707d4c4094f7))

## [2.1.4](https://github.com/mynaparrot/plugNmeet-client/compare/v2.1.3...v2.1.4) (2026-02-11)


### Bug Fixes

* `pauseUpstream` when we're not connected with NATS ([669da1b](https://github.com/mynaparrot/plugNmeet-client/commit/669da1bacf6deb9eafa63170fbeeedad695c427f))
* better to use `switch` ([fa2b468](https://github.com/mynaparrot/plugNmeet-client/commit/fa2b4689acd0ed449d8e6707c21a3761cd354716))
* ensure DB connected before operation ([9a7024b](https://github.com/mynaparrot/plugNmeet-client/commit/9a7024bde4ead9db14076eec516b09b08ce6d50d))
* ensure NATS is connected for using any service ([aca2c6f](https://github.com/mynaparrot/plugNmeet-client/commit/aca2c6f9e91cb67f1dafa1e412cb93c4cb0e210c))
* **feature:** implemented PiP using upcoming `DocumentPictureInPicture` feature ([0bdaeec](https://github.com/mynaparrot/plugNmeet-client/commit/0bdaeec9a12880ebc283f954b154f0fc1286ac90))
* **feature:** implemented PONG from server to client to detect backend server's responsiveness ([34b8101](https://github.com/mynaparrot/plugNmeet-client/commit/34b81017d31258b2dca6f7f9276ef340e63ef46e))
* follow NATS ping interval same as application ([ca3500e](https://github.com/mynaparrot/plugNmeet-client/commit/ca3500e7ccb62031849da7920504d58671ae5ba4))
* for VB use `webgl2` as default pipeline with fallback to `canvas2dCpu` ([3b4238c](https://github.com/mynaparrot/plugNmeet-client/commit/3b4238c6c766000dd4099916a8661531584e4e11))
* new Crowdin updates ([35dfe66](https://github.com/mynaparrot/plugNmeet-client/commit/35dfe6656a7d605eb20f2adaf0f35c377473d924))
* problem with crossOrigin ([7b4fb62](https://github.com/mynaparrot/plugNmeet-client/commit/7b4fb62132a2da1c4ed0ab88708c2922311d4ac5))
* spacing issue ([ea46de3](https://github.com/mynaparrot/plugNmeet-client/commit/ea46de386824226a6ce6879006912c15058ef1a3))
* spacing issue ([8cf54f2](https://github.com/mynaparrot/plugNmeet-client/commit/8cf54f29ef9b9fd5b9888e55db75da4ed8783060))
* toast wasn't cleaning ([18ed195](https://github.com/mynaparrot/plugNmeet-client/commit/18ed195c46935868d49a433226fb742dff7d44cf))
* upgrade excalidraw to latest RC ([ea96d99](https://github.com/mynaparrot/plugNmeet-client/commit/ea96d9939105e38a4ab4b56c027ccfc89ba569fd))
* whiteboard style ([fc09589](https://github.com/mynaparrot/plugNmeet-client/commit/fc09589dc394a0d173a008df6b0d1fd104274528))
* whiteboard style ([2c3843a](https://github.com/mynaparrot/plugNmeet-client/commit/2c3843a6484cb2219189f9818745a01e0ab1e470))

## [2.1.3](https://github.com/mynaparrot/plugNmeet-client/compare/v2.1.2...v2.1.3) (2026-01-31)


### Bug Fixes

* deliver private messages routed by server through private channel ([3334261](https://github.com/mynaparrot/plugNmeet-client/commit/3334261126763fc70368cd4986a15f5339bce8b9))

## [2.1.2](https://github.com/mynaparrot/plugNmeet-client/compare/v2.1.1...v2.1.2) (2026-01-30)


### Bug Fixes

* wrong filtering of data ([5a1d213](https://github.com/mynaparrot/plugNmeet-client/commit/5a1d213877af40cc170ccfd359d5a334ab25c07e))

## [2.1.1](https://github.com/mynaparrot/plugNmeet-client/compare/v2.1.0...v2.1.1) (2026-01-30)


### Bug Fixes

* bump deps ([53de031](https://github.com/mynaparrot/plugNmeet-client/commit/53de031de6948fad6d3264c1eb3fa5e1c494cc96))
* clean up + bump proto ([0835005](https://github.com/mynaparrot/plugNmeet-client/commit/0835005c2ce16b896bd59595e77e3bbc2828bce7))
* deps update ([0540223](https://github.com/mynaparrot/plugNmeet-client/commit/0540223928193294138c7994c7a8ff934b5ecc0a))
* **deps:** update dependency axios to v1.13.3 ([8867b4c](https://github.com/mynaparrot/plugNmeet-client/commit/8867b4c648f88776db2830918ba7719e95bdf56d))
* **deps:** update dependency axios to v1.13.3 ([a84c262](https://github.com/mynaparrot/plugNmeet-client/commit/a84c26246fda247d39013aed2d60f00ac0f2c77f))
* merged notification into application ([0d81614](https://github.com/mynaparrot/plugNmeet-client/commit/0d81614768414649277aa1ad9e579216a400e935))
* migrate chat to core pub/sub ([307c735](https://github.com/mynaparrot/plugNmeet-client/commit/307c735977b82de910f3e960108dcd36123c7604))
* nats optimisation ([2141234](https://github.com/mynaparrot/plugNmeet-client/commit/2141234e0e61cf69388e396253462f31bbdbb2f8))
* nats optimisation ([4547a08](https://github.com/mynaparrot/plugNmeet-client/commit/4547a0882848f60b31a02fde934341e3b9dd3668))
* new Crowdin updates ([cf973d0](https://github.com/mynaparrot/plugNmeet-client/commit/cf973d03d838e21567e007b10856fc417adab3d4))
* new Crowdin updates ([fc6ed1a](https://github.com/mynaparrot/plugNmeet-client/commit/fc6ed1aed227bce45cd67ab0d776c51a7bee20e9))
* periodically sync users and reconcile ([8fb8bc0](https://github.com/mynaparrot/plugNmeet-client/commit/8fb8bc0390cc18966060826ad569eb01d1f0f5b4))
* update the data flow ([55f78f8](https://github.com/mynaparrot/plugNmeet-client/commit/55f78f8a0251f3a3767c41ac7eb53e385f669f1c))
* use nats core pub/sub for high-performance, loss-tolerant events like `TRANSCRIPTION_OUTPUT_TEXT` ([74b1f17](https://github.com/mynaparrot/plugNmeet-client/commit/74b1f178fce4d611ad2e039190fcf133f012bc91))

## [2.1.0](https://github.com/mynaparrot/plugNmeet-client/compare/v2.0.3...v2.1.0) (2026-01-21)


### Features

* SIP dial-in ([816b37e](https://github.com/mynaparrot/plugNmeet-client/commit/816b37ef0975b902048953c04aaf073bb972ba2a))
* SIP dial-in ([6a4299d](https://github.com/mynaparrot/plugNmeet-client/commit/6a4299d420b0799df7a67e2dea5cb1d3992231c9))


### Bug Fixes

* bump proto ([e4f02e2](https://github.com/mynaparrot/plugNmeet-client/commit/e4f02e2dd03fe676e9afc786fb50ae9850e2907d))
* dependencies update ([a20350a](https://github.com/mynaparrot/plugNmeet-client/commit/a20350a36d601ad7ffeecee26f70e0d44aca17e7))
* header tab design ([e2d5e36](https://github.com/mynaparrot/plugNmeet-client/commit/e2d5e36028bded7e214555667575b7c2ccd5368f))
* invalid avatar for SIP phone ([438d1d3](https://github.com/mynaparrot/plugNmeet-client/commit/438d1d30f315286509ca4c34a7bab71f4ece386f))
* **layout:** Improve active speaker re-ordering logic ([9f52cd3](https://github.com/mynaparrot/plugNmeet-client/commit/9f52cd3a90f56efa89a95c56095ed10a3a1fcc90))
* mask phone number in proper way ([41f4123](https://github.com/mynaparrot/plugNmeet-client/commit/41f412350226765b665a1ae1ab0052f5a75a40b8))
* new Crowdin updates ([c514b25](https://github.com/mynaparrot/plugNmeet-client/commit/c514b2514762c6728426de6fd11f68d8e4e93e42))
* new Crowdin updates ([692e047](https://github.com/mynaparrot/plugNmeet-client/commit/692e047cbda235375951dda25c340a0cafd215f6))
* new Crowdin updates ([b27c667](https://github.com/mynaparrot/plugNmeet-client/commit/b27c66727287ddf69e6917ebbdf0110ba052ebf0))
* next/prev button height issue ([5500fd8](https://github.com/mynaparrot/plugNmeet-client/commit/5500fd872c91486d38d96afc4b1edb975aae08a7))
* on disconnect close all tracks ([8c4096f](https://github.com/mynaparrot/plugNmeet-client/commit/8c4096f731c5c3d27116d6a8f62668059b778b50))
* option to set max number of visible webcams ([19cc268](https://github.com/mynaparrot/plugNmeet-client/commit/19cc268e44705b3baf0016ecb2ef76918ba83964))
* removed deprecated `speechServices` ([3c51af8](https://github.com/mynaparrot/plugNmeet-client/commit/3c51af8d63785bf69514cbf88c9be6ca1fbc3378))
* SIP design + logic ([b13b5b1](https://github.com/mynaparrot/plugNmeet-client/commit/b13b5b14e767f7b0879385ef349d9db936e8d4e8))
* SIP user name ([5d44a47](https://github.com/mynaparrot/plugNmeet-client/commit/5d44a47c038e695967833835b1637a99449c2a58))
* use sip provided name ([fe705fa](https://github.com/mynaparrot/plugNmeet-client/commit/fe705fa2c6abd6638d3d9a172bf79daea8e3c805))

## [2.0.3](https://github.com/mynaparrot/plugNmeet-client/compare/v2.0.2...v2.0.3) (2026-01-12)


### Bug Fixes

* added missing string ([6062f37](https://github.com/mynaparrot/plugNmeet-client/commit/6062f37c22ff40974cd0f5452a672cdc1a02c4d4))
* config of `focusActiveSpeakerWebcam` was not working ([6b5fb2c](https://github.com/mynaparrot/plugNmeet-client/commit/6b5fb2c6c02399cb16a209bd1ba1073d8ff2b955))
* **nats:** Prevent head-of-line blocking in MessageQueue ([91a7417](https://github.com/mynaparrot/plugNmeet-client/commit/91a74177f5d2b3e3265da9ef5e556f4973e89ff9))
* new Crowdin updates ([56ba01d](https://github.com/mynaparrot/plugNmeet-client/commit/56ba01ddbfa926f7eceda18d24d7667bf698f6a2))
* ping more frequently ([4226d06](https://github.com/mynaparrot/plugNmeet-client/commit/4226d062bbb4b7ec099af43b52fca2d3ac17f3a0))
* **refactor:** migrate whiteboard & dataChannel to use nats core pub/sub for low latency as jetstream seems very slow ([df5e0a0](https://github.com/mynaparrot/plugNmeet-client/commit/df5e0a023d2b42b044a8c3dad86502d009ddc7c8))

## [2.0.2](https://github.com/mynaparrot/plugNmeet-client/compare/v2.0.1...v2.0.2) (2025-12-26)


### Bug Fixes

* display ai text icon ([a2ee4d3](https://github.com/mynaparrot/plugNmeet-client/commit/a2ee4d307345ec1f5293c90d74d931f474c4519b))
* draggable components & header ([2676396](https://github.com/mynaparrot/plugNmeet-client/commit/26763963dd9ca0be172ea34bb7d693088b81d746))
* icon hide for mobile ([ef5925c](https://github.com/mynaparrot/plugNmeet-client/commit/ef5925c250debd9563289c47ae69b357b12909dd))
* invalid customDesign param ([29d169d](https://github.com/mynaparrot/plugNmeet-client/commit/29d169d8e05a54d7834b5773b3c579080f0c78e9))
* use try..catch to handle error better way ([e17338b](https://github.com/mynaparrot/plugNmeet-client/commit/e17338be27e20e8f32344998c1792162d67e4690))

## [2.0.1](https://github.com/mynaparrot/plugNmeet-client/compare/v2.0.0...v2.0.1) (2025-12-22)


### Bug Fixes

* bug in recorder's user counting ([4dee807](https://github.com/mynaparrot/plugNmeet-client/commit/4dee807490645abf7f5ec78e172b14fec0a52a50))
* clean up deprecated code ([11fbf59](https://github.com/mynaparrot/plugNmeet-client/commit/11fbf59b6ff16110e1b03ad4c9873be67da279ed))
* use redux to get actual data of users ([15d3068](https://github.com/mynaparrot/plugNmeet-client/commit/15d306839a2b1358ecce7f81fa2b55d52273b347))

## [2.0.0](https://github.com/mynaparrot/plugNmeet-client/compare/v1.7.5...v2.0.0) (2025-12-20)


### ⚠ BREAKING CHANGES

* breaking changes in new UI + API

### Features

* ability to download transcription in vtt format ([1d96bcc](https://github.com/mynaparrot/plugNmeet-client/commit/1d96bcc7d58cb0fa5ed7a38a31becf59c3e18663))
* added new config option `disableDarkMode` & renamed `right_side_bg_color` =&gt; `right_panel_bg_color` with backward compatibility ([2f5b6c7](https://github.com/mynaparrot/plugNmeet-client/commit/2f5b6c7976da50f690020452ddc91f4ce416e485))
* added progress bar to indicate uploading progress ([a96ce0c](https://github.com/mynaparrot/plugNmeet-client/commit/a96ce0c87a487f6011568ab7b1d5056201a59c62))
* AI Assistant Chat ([541f876](https://github.com/mynaparrot/plugNmeet-client/commit/541f876cbd874f8ebb084e72bb89524093228eda))
* allow to add multiple links ([3d094b8](https://github.com/mynaparrot/plugNmeet-client/commit/3d094b81eb4a86efaeb5d6436376d31f9402af29))
* breaking changes in new UI + API ([6b0fc16](https://github.com/mynaparrot/plugNmeet-client/commit/6b0fc1649a8c1bfcd1c5d771541cff9afad1fa61))
* **breakout-room:** added button to push invitation ([1d9ab90](https://github.com/mynaparrot/plugNmeet-client/commit/1d9ab900f7b2941aa0359f2061a4f92369b0695b))
* **breakout-room:** invalid userId ([7f98407](https://github.com/mynaparrot/plugNmeet-client/commit/7f98407f1d954df49d39e8d021c1f978e90c3456))
* designCustomization support both in JS Object or JSON format ([f875be6](https://github.com/mynaparrot/plugNmeet-client/commit/f875be66da631538c28438a7b6645f77682c3089))
* display notification while talking in muted state ([98f0bb5](https://github.com/mynaparrot/plugNmeet-client/commit/98f0bb5b9e9f7f042e1a42337e879deb14614072))
* Insights framework ([ae4a75f](https://github.com/mynaparrot/plugNmeet-client/commit/ae4a75f5839dcb4dcafae66a4f4befecef3c3c94))
* **refactor:** migrate to single object configuration with backward compatibility ([ae5d4ed](https://github.com/mynaparrot/plugNmeet-client/commit/ae5d4ed99dd3655ef6394b342945f7d056b4351f))
* **refactor:** moved InsightsAiTextChat from panel to separate Draggable panel ([a94e446](https://github.com/mynaparrot/plugNmeet-client/commit/a94e4465f0aee1a0acc8b81e4f525e49eb4238e2))
* replaced `localStorage` with `indexedDB` ([4194c3e](https://github.com/mynaparrot/plugNmeet-client/commit/4194c3ecc8260cad11da048cf81c35271ba94de1))
* store speech to text data in local DB ([3371384](https://github.com/mynaparrot/plugNmeet-client/commit/33713840c10b632594c44a98f2e8495e424860ef))
* use single side panel logic ([cc23fd1](https://github.com/mynaparrot/plugNmeet-client/commit/cc23fd1da4a6db13bbb0ffd8911fa340042f8789))
* webcams layout calculation for mobile + tablet ([8027ae9](https://github.com/mynaparrot/plugNmeet-client/commit/8027ae9bc08e9e1d8814c73ecbfde223fc60b3e4))
* **whiteboard:** save valid data in local storage upon change ([5ff1b9e](https://github.com/mynaparrot/plugNmeet-client/commit/5ff1b9edd82a443b78cd792695c18f3cdf2946df))


### Bug Fixes

* `AudioContext` was created too early ([b1124db](https://github.com/mynaparrot/plugNmeet-client/commit/b1124db514334c87cd6d15adf61df1aea80b86aa))
* add back icon ([aa5d98f](https://github.com/mynaparrot/plugNmeet-client/commit/aa5d98fbea0b5a9dd918096ab9bc338019beab31))
* added release please ([fe34f55](https://github.com/mynaparrot/plugNmeet-client/commit/fe34f55417fd29e82b31f6f73ef184ee0fa04d5a))
* adjusted messages in landing page ([3e2360f](https://github.com/mynaparrot/plugNmeet-client/commit/3e2360fd79b041a39b2a1714dc0ff34f88bd71ef))
* adjusted with new API ([07baad3](https://github.com/mynaparrot/plugNmeet-client/commit/07baad38b1109f36168e02ef8a9ade1b9b73251e))
* allow to configure `DB_MAX_AGE_MS` value ([6abda6a](https://github.com/mynaparrot/plugNmeet-client/commit/6abda6ae71e4ea504cf60a48b00cc14f6f6d55fe))
* allow to configure `DB_MAX_AGE_MS` value ([3c6e7d5](https://github.com/mynaparrot/plugNmeet-client/commit/3c6e7d57b91ba27f68d6388b643b0d8992549cc5))
* breakpoint ([c14497c](https://github.com/mynaparrot/plugNmeet-client/commit/c14497c52b191c8187a6c15226bccc3c0244ea70))
* **bug:** collaborator wasn't cleanup properly when right update ([dadf7cd](https://github.com/mynaparrot/plugNmeet-client/commit/dadf7cd9743b0dd1826f1226fd7dfac2b0f19918))
* bump deps ([0f8dac3](https://github.com/mynaparrot/plugNmeet-client/commit/0f8dac36c77b61524b668cdabfe54b60c3dfff22))
* bump proto ([daf57fe](https://github.com/mynaparrot/plugNmeet-client/commit/daf57fe626d4fc452ff1181617b3997e1cebca99))
* bump proto ([1bdc64b](https://github.com/mynaparrot/plugNmeet-client/commit/1bdc64b3ed5ac8bab8e66e0d0276ee3a2764a006))
* consider not to clean everything ([8dcdac4](https://github.com/mynaparrot/plugNmeet-client/commit/8dcdac408267ca23e43f658a07d2d429419177a6))
* customization ([d026391](https://github.com/mynaparrot/plugNmeet-client/commit/d0263912e1332f0d4481c9341311552873620d97))
* dependencies update ([b5415d5](https://github.com/mynaparrot/plugNmeet-client/commit/b5415d5e92c0cc87000163d59eaea5f590b7b456))
* **design:** added better lock design ([8f8ffac](https://github.com/mynaparrot/plugNmeet-client/commit/8f8ffac1db557aaf30633a48ecd5dcaa2f00b5c1))
* designCustomization and muted toltip ([01f232a](https://github.com/mynaparrot/plugNmeet-client/commit/01f232a1cf2116cbaf17b2b5f63a0508b23c0c31))
* disable button when working ([f7babe4](https://github.com/mynaparrot/plugNmeet-client/commit/f7babe400321b66a803150bce8a6e3c4bcb66e39))
* don't show error when `connection draining` ([3f1fa2e](https://github.com/mynaparrot/plugNmeet-client/commit/3f1fa2eafa38dd4eb736aae0805e072c567c5c1f))
* **e2ee:** instead of using a static salt, we can use room sid as unique ([717ce0d](https://github.com/mynaparrot/plugNmeet-client/commit/717ce0dc0966467202e9c2d5616512fc86d075c3))
* enabled `inconsistentCjsInterop` for `react-player` ([6884fc2](https://github.com/mynaparrot/plugNmeet-client/commit/6884fc2a8b61cae9a4c84cb8005bfa18e1987bba))
* fixed the sequence of initialization ([05e4362](https://github.com/mynaparrot/plugNmeet-client/commit/05e43622c7346348a0732db87ac2f959eafaea64))
* hide ScrollDown button when not scrolling ([4e46d83](https://github.com/mynaparrot/plugNmeet-client/commit/4e46d8335f7a29a81b174683bb721551c231ef91))
* icons in the menu for small devices ([0fa3162](https://github.com/mynaparrot/plugNmeet-client/commit/0fa316249740d33c4426c27136fb3274c8b28bc4))
* improve connection flow ([c7e7420](https://github.com/mynaparrot/plugNmeet-client/commit/c7e742054fae45c70ada06ec138f9b70d06ad89c))
* make link clickable in chat + few animation ([be1dadd](https://github.com/mynaparrot/plugNmeet-client/commit/be1daddad9e3e7bc001f9b83e6755d3f9ddedb0c))
* media sub-menu items ([279a19c](https://github.com/mynaparrot/plugNmeet-client/commit/279a19c7ebaf69abbdea285f59bacad5df96ab0d))
* menu active color and Active speaker overlap ([0307f4e](https://github.com/mynaparrot/plugNmeet-client/commit/0307f4ee2a2df3ef6ae07da250a72e078177c646))
* modal overlap and f-menu hide ([019c03a](https://github.com/mynaparrot/plugNmeet-client/commit/019c03afe00f528f36fde50694372fee3f52c2c1))
* new Crowdin updates ([2322f1e](https://github.com/mynaparrot/plugNmeet-client/commit/2322f1ec1abd5d4f5388a46ba7de03fbc36fdc77))
* new Crowdin updates ([9e5fe18](https://github.com/mynaparrot/plugNmeet-client/commit/9e5fe18ca2f697be195095080e1a04ff06c513e7))
* new Crowdin updates ([6efc98d](https://github.com/mynaparrot/plugNmeet-client/commit/6efc98d49a9d4706e7b7408ab038e663a8ac3a84))
* new Crowdin updates ([a33f636](https://github.com/mynaparrot/plugNmeet-client/commit/a33f63658aa78ca505e5de8f81080bd78244b1e0))
* new Crowdin updates ([36d16ee](https://github.com/mynaparrot/plugNmeet-client/commit/36d16eeed3e16e91d0d78f6ccd029408eeec7ae1))
* open modal after end sharing ([5045d0a](https://github.com/mynaparrot/plugNmeet-client/commit/5045d0ac050874fe8d34844ccf88f612d066b4a6))
* pagination wasn't navigating to the next page ([8c7bf86](https://github.com/mynaparrot/plugNmeet-client/commit/8c7bf86e8539a247f60ebcc6da8050fc92cce77e))
* pin view logic ([84e0f0b](https://github.com/mynaparrot/plugNmeet-client/commit/84e0f0b54a2bc330b70c51f542802949b91031c3))
* **poll:** for not running poll defaultOpen value should be false for `Disclosure` ([1233487](https://github.com/mynaparrot/plugNmeet-client/commit/1233487a4644c9dc7ec053a343064155ce00c08f))
* presenter should send a clear whiteboard signal before changing page/file ([6918ec2](https://github.com/mynaparrot/plugNmeet-client/commit/6918ec2291915fd25ab832209768e644ce3dc77e))
* refactor waiting message with title ([e98c56c](https://github.com/mynaparrot/plugNmeet-client/commit/e98c56cb721f4647edd0f8ff04d6e05712e5be1a))
* removed extra comma at the end. ([238d296](https://github.com/mynaparrot/plugNmeet-client/commit/238d296cdceb80bdf1ce937536c41883da5d9985))
* replaced config object with new structure ([c052145](https://github.com/mynaparrot/plugNmeet-client/commit/c052145433249744a376d5924af7d3fb7798c5b0))
* rollback as not working with `react-player` ([005f8ba](https://github.com/mynaparrot/plugNmeet-client/commit/005f8ba81c634ab62f24909cbd14d2ba801ea288))
* screenHeight updated ([b80209c](https://github.com/mynaparrot/plugNmeet-client/commit/b80209cfcae659da5105f37d60660711393d8a76))
* the stream wasn't clear properly ([8f88026](https://github.com/mynaparrot/plugNmeet-client/commit/8f880262fe963e7990ef235b971df745f3f8ffe0))
* use `once` method ([7ba9bb1](https://github.com/mynaparrot/plugNmeet-client/commit/7ba9bb138dc440f355f3d32400b8b46084adc424))
* use `set` to prevent duplicate class ([5148f1b](https://github.com/mynaparrot/plugNmeet-client/commit/5148f1b7b0761bf4022540151a5feab8e18683ce))
* use Client Customization ([20655d9](https://github.com/mynaparrot/plugNmeet-client/commit/20655d911c2d4fa557f4a919254f24101bdcd72f))
* use correct reference ([3b3add6](https://github.com/mynaparrot/plugNmeet-client/commit/3b3add620cb0ce8c11b50f2286d2d2394f25192f))
* use helper method to better manage ([bdcde0f](https://github.com/mynaparrot/plugNmeet-client/commit/bdcde0f49b4ec30e5a8107d89e3ac32b702f300a))
* use new config to get `serverUrl` ([242f029](https://github.com/mynaparrot/plugNmeet-client/commit/242f029cffd0036247d99f8fac94c6615ebef3ad))
* use screen width to determine device type ([f49525d](https://github.com/mynaparrot/plugNmeet-client/commit/f49525d5dfaff22ae8631b31a32bf8df6d84bdc7))
* **whiteboard:** better use `useRef` ([0f35395](https://github.com/mynaparrot/plugNmeet-client/commit/0f353957f9022bd1d1808131ed468ad0ab0a3d2c))
* **whiteboard:** bug around canEdit logic, now more clear and replaced with `hashElementsVersion` ([c825f42](https://github.com/mynaparrot/plugNmeet-client/commit/c825f422f8381bf4561e28d22e142aaf441243a5))
* **whiteboard:** handle donor data more efficiently ([963be75](https://github.com/mynaparrot/plugNmeet-client/commit/963be75fc11c7a02fc9bd0741b025145f8d3b800))
* **whiteboard:** preloaded file wasn't working ([d3bcd90](https://github.com/mynaparrot/plugNmeet-client/commit/d3bcd90ac4b7e553a9c78324fc066bb5749dc7c9))

## [1.7.2](https://github.com/mynaparrot/plugNmeet-client/compare/v1.7.1...v1.7.2) (2025-06-27)


### Bug Fixes

* bump proto ([7a41f40](https://github.com/mynaparrot/plugNmeet-client/commit/7a41f40326370623bb10e9c372c1abda152664ce))

## [1.7.1](https://github.com/mynaparrot/plugNmeet-client/compare/v1.7.0...v1.7.1) (2025-04-10)


### Bug Fixes

* deps update ([d92aae7](https://github.com/mynaparrot/plugNmeet-client/commit/d92aae7a13c029e6f72a88ce53a7d6842d69b977))
* deps update ([c2b717e](https://github.com/mynaparrot/plugNmeet-client/commit/c2b717e45950308d7fb794b406a78781524cf30f))

## [1.7.0](https://github.com/mynaparrot/plugNmeet-client/compare/v1.6.10...v1.7.0) (2025-02-04)


### Features

* the ability to adjust the webcam's positioning according to the active speaker ([c6742cb](https://github.com/mynaparrot/plugNmeet-client/commit/c6742cbd5a372fca685f95dc2731fe9c273091a9))


### Bug Fixes

* **ci:** added beta release ([bc98ba9](https://github.com/mynaparrot/plugNmeet-client/commit/bc98ba92c7b8fc75414b79dd8f2f2b962607057c))
* **ci:** bump beta version ([dcd203b](https://github.com/mynaparrot/plugNmeet-client/commit/dcd203b8179604af08de8ae80453aadba9c2d925))
* **ci:** removed rebase again ([5e0e173](https://github.com/mynaparrot/plugNmeet-client/commit/5e0e1730443b80dd5488df0423ed73b6e6aedef1))
* **ci:** To rebase again ([79e1b93](https://github.com/mynaparrot/plugNmeet-client/commit/79e1b935e897b572919ab215693427655b1dca3f))
* dependencies upgrade ([2e55ff9](https://github.com/mynaparrot/plugNmeet-client/commit/2e55ff9e9b331e8f8b231b453442076245852f7b))
* deps update ([dd47326](https://github.com/mynaparrot/plugNmeet-client/commit/dd4732611a62b9575b45dcf77a889362a0c3e85f))
* **deps:** update dependency plugnmeet-protocol-js to v1.0.8 ([d8d170c](https://github.com/mynaparrot/plugNmeet-client/commit/d8d170c640a1c057e21b5cc59a5974f2b4649891))
* new Crowdin updates ([#853](https://github.com/mynaparrot/plugNmeet-client/issues/853)) ([1702fd6](https://github.com/mynaparrot/plugNmeet-client/commit/1702fd6bcd8fe9ab69d5cc164bdfb0c67b1a6c55))
* should not ask notification permission for recorder ([b33f6c2](https://github.com/mynaparrot/plugNmeet-client/commit/b33f6c2dc104e4f000eefc9cf976fae7f89d381d))

## [1.6.10](https://github.com/mynaparrot/plugNmeet-client/compare/v1.6.9...v1.6.10) (2024-12-20)


### Bug Fixes

* **bug:** Ingress was not working in the new Nats solution. Ref: https://github.com/mynaparrot/plugNmeet-server/discussions/611 ([f3b8374](https://github.com/mynaparrot/plugNmeet-client/commit/f3b8374721e082f36ddd8f73c2636e14b7553079))
* data message was sending to wrong user ([db628e4](https://github.com/mynaparrot/plugNmeet-client/commit/db628e4f837c7473d3b0330b633a178cf53a5f77))
* **deps:** dependencies upgrade ([6ce82ba](https://github.com/mynaparrot/plugNmeet-client/commit/6ce82bada17f352fb1c633072fe444924aa98066))
* **deps:** deps update ([ef77b9d](https://github.com/mynaparrot/plugNmeet-client/commit/ef77b9db2e7d993e9dee2594ad42b63a649c29ab))
* **deps:** update dependency i18next-browser-languagedetector to v8.0.2 ([955721d](https://github.com/mynaparrot/plugNmeet-client/commit/955721d0e8d83d92d6787b432ca05b2c31796595))
* **deps:** update dependency plugnmeet-protocol-js to v1.0.7-rc.11 ([7ee4999](https://github.com/mynaparrot/plugNmeet-client/commit/7ee4999bb6418a142a81bde4cf0b14c832111c9b))
* **feat:** use `Notification` API to notify when the current tab is not visible. ([62b8e43](https://github.com/mynaparrot/plugNmeet-client/commit/62b8e436525a61f58e85db639aeb7a19ac27c750))

## [1.6.9](https://github.com/mynaparrot/plugNmeet-client/compare/v1.6.8...v1.6.9) (2024-12-07)


### Bug Fixes

* **deps:** bump protocol ([3e9bbfd](https://github.com/mynaparrot/plugNmeet-client/commit/3e9bbfdf9f1030c4550189880ca6dfb60c530de5))
* **deps:** update dependencies ([0108802](https://github.com/mynaparrot/plugNmeet-client/commit/010880208a473c32844c28b769647bdf236711f1))
* set default value for ref ([9019f35](https://github.com/mynaparrot/plugNmeet-client/commit/9019f35a05ac9f0b9459eb073db629732bb46d7f))

## [1.6.8](https://github.com/mynaparrot/plugNmeet-client/compare/v1.6.7...v1.6.8) (2024-11-25)


### Bug Fixes

* **deps:** dependencies update ([2922538](https://github.com/mynaparrot/plugNmeet-client/commit/2922538edcfad8a9925600f39d45d540d5df17ec))
* **deps:** update dependencies ([d7f0a5e](https://github.com/mynaparrot/plugNmeet-client/commit/d7f0a5e87048e901b77dede9cbde9d969480f698))
* **deps:** update dependency @nats-io/jetstream to v3.0.0-23 ([7eb4e92](https://github.com/mynaparrot/plugNmeet-client/commit/7eb4e92d337d44dff7aef6d8b90ef9375672db58))
* **deps:** update dependency @nats-io/jetstream to v3.0.0-27 ([fd8bae6](https://github.com/mynaparrot/plugNmeet-client/commit/fd8bae6dabadbdd74a6fcf955191cbdd537ec3fa))
* **deps:** update dependency @nats-io/nats-core to v3.0.0-35 ([7af7e11](https://github.com/mynaparrot/plugNmeet-client/commit/7af7e11c4bd498152fca8cc05dac4c0dbf86285f))
* **locale:** added `한국어` ([b472966](https://github.com/mynaparrot/plugNmeet-client/commit/b472966d232fb548a679c09335d602a0fb679ff6))

## [1.6.7](https://github.com/mynaparrot/plugNmeet-client/compare/v1.6.6...v1.6.7) (2024-11-04)


### Bug Fixes

* missed to add languages ([1ffce62](https://github.com/mynaparrot/plugNmeet-client/commit/1ffce626486b0752f7a3dfeb640a89e6e5a27f65))
* typo ([b8103ce](https://github.com/mynaparrot/plugNmeet-client/commit/b8103cef8b67d780f2002be900e14712256eeda7))
* typo ([96cbcc3](https://github.com/mynaparrot/plugNmeet-client/commit/96cbcc3d7228ca9b71a3ae004409650b4adf0f23))

## [1.6.6](https://github.com/mynaparrot/plugNmeet-client/compare/v1.6.5...v1.6.6) (2024-11-03)


### Bug Fixes

* upload error ([ce262e0](https://github.com/mynaparrot/plugNmeet-client/commit/ce262e02f01a491bd399f4b988243bfed7cb0229))

## [1.6.5](https://github.com/mynaparrot/plugNmeet-client/compare/v1.6.4...v1.6.5) (2024-11-03)


### Bug Fixes

* new Crowdin updates ([#783](https://github.com/mynaparrot/plugNmeet-client/issues/783)) ([d80df3e](https://github.com/mynaparrot/plugNmeet-client/commit/d80df3e7df427ccfcb108d9b2a9e9d84d3c6c0ed))
* release-please-action ([2f58b73](https://github.com/mynaparrot/plugNmeet-client/commit/2f58b73483eafea72ac9edaf50e16372ac0158cb))
