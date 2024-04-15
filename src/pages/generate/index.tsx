import { Center, Group, Stack, Tabs, Text, ThemeIcon, createStyles } from '@mantine/core';
import { IconLayoutList } from '@tabler/icons-react';
import { IconGridDots, IconLock } from '@tabler/icons-react';
import React, { useState } from 'react';
import { setPageOptions } from '~/components/AppLayout/AppLayout';
import { Feed } from '~/components/ImageGeneration/Feed';
import { GeneratedImageActions } from '~/components/ImageGeneration/GeneratedImageActions';
import { GenerationProvider } from '~/components/ImageGeneration/GenerationProvider';
import { Queue } from '~/components/ImageGeneration/Queue';
import { ScrollArea } from '~/components/ScrollArea/ScrollArea';
import { useCurrentUser } from '~/hooks/useCurrentUser';
import { createServerSideProps } from '~/server/utils/server-side-helpers';
import { getLoginLink } from '~/utils/login-helpers';

/**
 * NOTE: This is still a WIP. We are currently working on a new design for the
 * image generation page. This is a temporary page until we have the new design
 */
export const getServerSideProps = createServerSideProps({
  useSession: true,
  resolver: async ({ session, features, ctx }) => {
    if (!session)
      return {
        redirect: {
          destination: getLoginLink({ returnUrl: ctx.req.url }),
          permanent: false,
        },
      };

    if (!features?.imageGeneration) return { notFound: true };
  },
});

export default function GeneratePage() {
  const currentUser = useCurrentUser();
  const { classes } = useStyles();
  const [tab, setTab] = useState<string>('queue');

  if (currentUser?.muted)
    return (
      <Center h="100%" w="75%" mx="auto">
        <Stack spacing="xl" align="center">
          <ThemeIcon size="xl" radius="xl" color="yellow">
            <IconLock />
          </ThemeIcon>
          <Text align="center">
            You have been muted, your account will be reviewed by a Community Manager within 48
            hours. You will be notified if your account is unmuted. You do not need to contact us.
          </Text>
        </Stack>
      </Center>
    );

  // desktop view
  return (
    <GenerationProvider>
      <Tabs
        variant="pills"
        value={tab}
        onTabChange={(tab) => {
          // tab can be null
          if (tab) setTab(tab);
        }}
        radius="xl"
        color="gray"
        classNames={classes}
      >
        <Tabs.List px="md" py="xs">
          <Group position="apart" w="100%">
            <Group align="flex-start" spacing="xs">
              <Tabs.Tab value="queue" icon={<IconLayoutList size={16} />}>
                Queue
              </Tabs.Tab>
              <Tabs.Tab value="feed" icon={<IconGridDots size={16} />}>
                Feed
              </Tabs.Tab>
            </Group>
            <GeneratedImageActions />
          </Group>
        </Tabs.List>
        <ScrollArea scrollRestore={{ key: tab }}>
          <Tabs.Panel value="queue">
            <Queue />
          </Tabs.Panel>
          <Tabs.Panel value="feed" p="md">
            <Feed />
          </Tabs.Panel>
        </ScrollArea>
      </Tabs>
    </GenerationProvider>
  );
}

setPageOptions(GeneratePage, { withScrollArea: false });

const useStyles = createStyles((theme) => {
  // const sidebarWidth = 400;
  // const sidebarWidthLg = 600;
  return {
    // mobileContent: {
    //   position: 'fixed',
    //   top: 'var(--mantine-header-height)',
    //   left: 0,
    //   right: 0,
    //   bottom: 0,
    // },
    // tab: {
    //   '&[data-active]': {
    //     backgroundColor: theme.fn.rgba(theme.colors.blue[7], 0.7),
    //   },
    // },
    root: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    },
    panel: {
      height: '100%',
      width: '100%',
    },
    tabsList: {
      width: '100%',
      borderBottom:
        theme.colorScheme === 'dark'
          ? `1px solid ${theme.colors.dark[5]}`
          : `1px solid ${theme.colors.gray[2]}`,
    },
  };
});
