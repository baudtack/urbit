import React, { Component, Fragment } from 'react';
import { BaseAnchor, BaseImage, Box, Button, Text, Row, Icon } from '@tlon/indigo-react';
import styled from 'styled-components';
import { hasProvider } from 'oembed-parser';
import EmbedContainer from 'react-oembed-container';
import useSettingsState from '~/logic/state/settings';
import { RemoteContentPolicy } from '~/types/local-update';
import { VirtualContextProps, withVirtual } from "~/logic/lib/virtualContext";
import { IS_IOS } from '~/logic/lib/platform';
import withState from '~/logic/lib/withState';
import {Link} from 'react-router-dom';

type RemoteContentProps = VirtualContextProps & {
  url: string;
  text?: string;
  unfold?: boolean;
  renderUrl?: boolean;
  remoteContentPolicy: RemoteContentPolicy;
  imageProps?: any;
  audioProps?: any;
  videoProps?: any;
  oembedProps?: any;
  textProps?: any;
  style?: any;
}

interface RemoteContentState {
  unfold: boolean;
  embed: any | undefined;
  noCors: boolean;
}

const IMAGE_REGEX = new RegExp(/(jpg|img|png|gif|tiff|jpeg|webp|webm|svg)$/i);
const AUDIO_REGEX = new RegExp(/(mp3|wav|ogg)$/i);
const VIDEO_REGEX = new RegExp(/(mov|mp4|ogv)$/i);

const TruncatedText = styled(Text)`
  white-space: pre;
  text-overflow: ellipsis;
  overflow: hidden;
  min-width: 0;
`;

class RemoteContent extends Component<RemoteContentProps, RemoteContentState> {
  private fetchController: AbortController | undefined;
  containerRef: HTMLDivElement | null = null;
  private saving = false;
  constructor(props) {
    super(props);
    this.state = {
      unfold: props.unfold || false,
      embed: undefined,
      noCors: false
    };
    this.unfoldEmbed = this.unfoldEmbed.bind(this);
    this.loadOembed = this.loadOembed.bind(this);
    this.wrapInLink = this.wrapInLink.bind(this);
    this.onError = this.onError.bind(this);
  }

  save = () => {
    if(this.saving) {
      return;
    }
    this.saving = true;
    this.props.save();
  };

  restore = () => {
    this.saving = false;
    this.props.restore();
  }

  componentWillUnmount() {
    if(this.saving) {
      this.restore();
    }
    if (this.fetchController) {
      this.fetchController.abort();
    }
  }

  unfoldEmbed(event: Event) {
    event.stopPropagation();
    let unfoldState = this.state.unfold;
    unfoldState = !unfoldState;
    this.save();
    this.setState({ unfold: unfoldState });
    requestAnimationFrame(() => {
      this.restore();
    });
  }


  componentDidUpdate(prevProps, prevState) {
    if(prevState.embed !== this.state.embed) {
      //console.log('remotecontent: restoring');
      //prevProps.shiftLayout.restore();
    }
    const { url } = this.props;
    if(url !== prevProps.url && (IMAGE_REGEX.test(url) || AUDIO_REGEX.test(url) || VIDEO_REGEX.test(url))) {
      this.save();
    };

  }

  componentDidMount() {
  }

  onLoad = () => {
    window.requestAnimationFrame(() => {
      const { restore } = this;
      restore();
    });

  }

  loadOembed() {
    this.fetchController = new AbortController();
    fetch(`https://noembed.com/embed?url=${this.props.url}`, {
      signal: this.fetchController.signal
    })
    .then(response => response.clone().json())
    .then((result) => {
      this.setState({ embed: result });
    }).catch((error) => {
      if (error.name === 'AbortError')
return;
      this.setState({ embed: 'error' });
    });
  }

  wrapInLink(contents, textOnly = false) {
    const { style } = this.props;
    return (
      <Row
        alignItems="center"
        maxWidth="min(100%, 20rem)"
        gapX="1" borderRadius="1" backgroundColor="washedGray">
        { textOnly && (<Icon ml="2" display="block" icon="ArrowExternal" />)}
        <BaseAnchor
          display="flex"
          p="2"
        onClick={(e) => { e.stopPropagation(); }}
        href={this.props.url}
        flexShrink={0}
        whiteSpace="nowrap"
        overflow="hidden"
        textOverflow="ellipsis"
        minWidth="0"
        width={textOnly ? "calc(100% - 24px)" : "fit-content"}
        maxWidth="min(500px, 100%)"
        style={{ color: 'inherit', textDecoration: 'none', ...style }}
        target="_blank"
        rel="noopener noreferrer"
              >
        {contents}
      </BaseAnchor>
    </Row>
    );
  }

  onError(e: Event) {
    this.restore();
    this.setState({ noCors: true });
  }

  render() {
    const {
      remoteContentPolicy,
      url,
      text,
      unfold = false,
      renderUrl = true,
      imageProps = {},
      audioProps = {},
      videoProps = {},
      oembedProps = {},
      textProps = {},
      style = {},
      ...props
    } = this.props;
    const { onLoad } = this;
    const { noCors } = this.state;
    const isImage = IMAGE_REGEX.test(url);
    const isAudio = AUDIO_REGEX.test(url);
    const isVideo = VIDEO_REGEX.test(url);
    const isOembed = hasProvider(url);

    if (isImage && remoteContentPolicy.imageShown) {
      return this.wrapInLink(
        <BaseImage
          {...(noCors ? {} : { crossOrigin: "anonymous" })}
          referrerPolicy="no-referrer"
          flexShrink={0}
          src={url}
          style={style}
          onLoad={onLoad}
          onError={this.onError}
          height="100%"
          width="100%"
          objectFit="contain"
          {...imageProps}
          {...props}
        />
      );
    } else if (isAudio && remoteContentPolicy.audioShown) {
      return (
        <>
          {renderUrl
            ? this.wrapInLink(<TruncatedText {...textProps}>{text || url}</TruncatedText>)
            : null}
          <audio
            onClick={(e) => { e.stopPropagation(); }}
            controls
            className="db"
            src={url}
            style={style}
            onLoad={onLoad}
            objectFit="contain"
            height="100%"
            width="100%"
            {...audioProps}
            {...props}
          />
        </>
      );
    } else if (isVideo && remoteContentPolicy.videoShown) {
      return (
        <>
          {renderUrl
            ? this.wrapInLink(<TruncatedText {...textProps}>{text || url}</TruncatedText>)
            : null}
          <video
            onClick={(e) => { e.stopPropagation(); }}
            controls
            className="db"
            src={url}
            style={style}
            onLoad={onLoad}
            objectFit="contain"
            height="100%"
            width="100%"
            {...videoProps}
            {...props}
          />
        </>
      );
    } else if (isOembed && remoteContentPolicy.oembedShown) {
      if (!this.state.embed || this.state.embed?.html === '') {
        this.loadOembed();
      }

      return (
        <Fragment>
          {renderUrl
            ? this.wrapInLink(<TruncatedText {...textProps}>{(this.state.embed && this.state.embed.title)
              ? this.state.embed.title
              : (text || url)}</TruncatedText>, true)
            : null}
          {this.state.embed !== 'error' && this.state.embed?.html && !unfold ? <Button
            display='inline-flex'
            border={1}
            height={3}
            ml={1}
            onClick={this.unfoldEmbed}
            flexShrink={0}
            style={{ cursor: 'pointer' }}
                                                                               >
            {this.state.unfold ? 'collapse' : 'expand'}
          </Button> : null}
          <Box
            mb='2'
            width='100%'
            flexShrink={0}
            display={this.state.unfold ? 'block' : 'none'}
            className='embed-container'
            style={style}
            flexShrink={0}
            onLoad={this.onLoad}
            {...oembedProps}
            {...props}
          >
            {this.state.embed && this.state.embed.html && this.state.unfold
            ? <EmbedContainer markup={this.state.embed.html}>
              <div className="embed-container" ref={(el) => {
                this.onLoad();
 this.containerRef = el;
}}
                dangerouslySetInnerHTML={{ __html: this.state.embed.html }}
              ></div>
            </EmbedContainer>
            : null}
          </Box>
        </Fragment>
      );
    } else {
      return renderUrl
        ? this.wrapInLink(<TruncatedText {...textProps}>{text || url}</TruncatedText>, true)
        : null;
    }
  }
}

export default withState(withVirtual(RemoteContent), [[useSettingsState, ['remoteContentPolicy']]]);
