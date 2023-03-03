type StatusCode = "OK" | "Error" | "NoData";
type SettingBool = 0 | 1;
interface GlobalSettings {
	autoNext: SettingBool;
	autoPlay: SettingBool;
	download: SettingBool;
	autoRefresh: SettingBool;
	downloadPattern: string;
	staffelNr: number;
}
type GlobalSettingsNames = TupleUnion<keyof GlobalSettings>;
type TupleUnion<U extends string, R extends string[] = []> = {
	[S in U]: Exclude<U, S> extends never ? [...R, S] : TupleUnion<Exclude<U, S>, [...R, S]>;
}[U] &
	string[];

type MessageCallback<TName extends keyof MessageDeclarations> =
	| {
			status: "OK";
			content: MessageDeclarations[TName][1];
	  }
	| {
			status: "NoData";
	  };
type MessageCallbackRaw<TName extends keyof MessageDeclarations> =
	| {
			status: "OK";
			content: MessageDeclarations[TName][1];
	  }
	| {
			status: "Error";
	  }
	| {
			status: "NoData";
	  };
type MessageInfo<TName extends keyof MessageDeclarations> = MessageDeclarations[TName][0];
type MessageRequest<TName extends keyof MessageDeclarations> = {
	message: MessageDeclarations[TName][0];
	type: TName;
};
interface MessageDeclarations {
	setVideoUrl: [{ url: string; type: "Next" | "Prev" | "Cur" }, void];
	updateStreamStatus: [{ status: StreamStatus; name: string; episode: number }, void];
	updatePageStatus: [string, void];
	globalEvent: [GlobalEvent, void];
	sendVideoInfo: [VideoInfo, void];
	saveProgress: [{ id: string; time: number }, void];
	streamLoaded: [string, { savedTime: false } | { savedTime: true; time: number }];
	download: [{ info: VideoInfo; mass: boolean }, boolean];
	getVideoUrl: [{ name: string; episode: number }, void];
	getVideoUrl_reply: [string, void];
	massDownload: [{ name: string; episode: number; url: string }, void];
	getCinemaMode: [void, boolean];
	setCinemaMode: [boolean, void];
	prepareTimestamps: [VideoInfo, void];
	requestTimestamps: [{ name: string; episode: number }, void];
	sendTimestamps: [TimeStamp[], void];
}
interface VideoInfo {
	name: string;
	episode: number;
	maxEpisode: number;
	language: string;
}
type StreamStatus = "None" | "Original" | "Created_Next" | "Created_Prev" | "Download";
type GlobalEvent =
	| "HasNext"
	| "HasPrev"
	| "NoNext"
	| "NoPrev"
	| "JumpNext"
	| "JumpPrev"
	| "JumpNextOld"
	| "JumpPrevOld"
	| "ExitFullscreen"
	| "MassDownloadDone";
interface RawTimestampResultData {
	data: {
		searchShows: Array<{
			id: string;
			name: string;
			episodeCount: number;
			episodes: Array<RawEpisodeData>;
		}>;
	};
}
interface RawEpisodeData {
	name: string;
	number?: string;
	absoluteNumber?: string;
	season?: string;
	timestamps: Array<{
		type: {
			name: TimestampType;
		};
		at: number;
	}>;
}
type TimestampType =
	| "Branding"
	| "Recap"
	| "Intro"
	| "Title Card"
	| "Canon"
	| "Transition"
	| "Credits";
interface TimeStamp {
	type: TimestampType;
	at: number;
}

interface SavedTimestampData {
	[name: string]: {
		[episode: number]: {
			name: string;
			season?: number;
			timeStamps: Array<TimeStamp>;
		};
	};
}
