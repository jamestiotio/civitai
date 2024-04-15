import { AspectRatio, Card, CardProps, createStyles } from '@mantine/core';
import Link from 'next/link';
import React, { forwardRef } from 'react';
import { BadgeCosmetic, ContentDecorationCosmetic } from '~/server/selectors/cosmetic.selector';
import { EdgeMedia } from '~/components/EdgeMedia/EdgeMedia';
import { DEFAULT_EDGE_IMAGE_WIDTH } from '~/server/common/constants';

type AspectRatio = 'portrait' | 'landscape' | 'square' | 'flat';
const aspectRatioValues: Record<
  AspectRatio,
  { ratio: number; height: number; cssRatio: number; stringRatio: string }
> = {
  portrait: {
    ratio: 7 / 9,
    height: 430,
    // CSS Ratio should be opposite to ratio as it will rely on width.
    cssRatio: 9 / 7,
    stringRatio: '7/9',
  },
  landscape: {
    ratio: 9 / 7,
    height: 300,
    cssRatio: 7 / 9,
    stringRatio: '9/7',
  },
  flat: {
    ratio: 15 / 7,
    height: 300,
    cssRatio: 7 / 15,
    stringRatio: '15/7',
  },
  square: {
    ratio: 1,
    height: 332,
    cssRatio: 1,
    stringRatio: '1',
  },
};

const useStyles = createStyles((theme) => {
  return {
    root: {
      padding: '0 !important',
      color: 'white',
      borderRadius: theme.radius.md,
      cursor: 'pointer',
      position: 'relative',
      overflow: 'hidden',
    },
  };
});

export const FeedCard = forwardRef<HTMLAnchorElement, Props>(
  (
    {
      href,
      children,
      aspectRatio = 'portrait',
      className,
      useCSSAspectRatio,
      frameDecoration,
      ...props
    },
    ref
  ) => {
    const { stringRatio } = aspectRatioValues[aspectRatio];
    const { classes, cx } = useStyles();

    const card = (
      <Card<'a'>
        className={cx(classes.root, className)}
        {...props}
        component={href ? 'a' : undefined}
        ref={ref}
        style={{ aspectRatio: stringRatio }}
      >
        {children}
      </Card>
    );

    return (
      <div style={{ position: 'relative' }}>
        {href ? (
          <Link href={href} passHref>
            {card}
          </Link>
        ) : (
          card
        )}
        {frameDecoration && frameDecoration.data.url ? (
          <EdgeMedia
            src={frameDecoration.data.url}
            type="image"
            name="card decoration"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%,-50%)',
              width: frameDecoration.data.offset
                ? `calc(100% + ${frameDecoration.data.offset})`
                : '100%',
              height: frameDecoration.data.offset
                ? `calc(100% + ${frameDecoration.data.offset})`
                : '100%',
              zIndex: 20,
              pointerEvents: 'none',
            }}
            width={frameDecoration.data.animated ? 'original' : DEFAULT_EDGE_IMAGE_WIDTH}
            anim={frameDecoration.data.animated}
          />
        ) : null}
      </div>
    );
  }
);

FeedCard.displayName = 'FeedCard';

type Props = CardProps & {
  children: React.ReactNode;
  href?: string;
  aspectRatio?: AspectRatio;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  useCSSAspectRatio?: boolean;
  frameDecoration?: ContentDecorationCosmetic | null;
};
