import { Drawer, DrawerProps, Tabs, createStyles } from '@mantine/core';
import { IconBrush, IconListDetails, IconSlideshow } from '@tabler/icons-react';
import { useRouter } from 'next/router';
import { z } from 'zod';
import { useIsMobile } from '~/hooks/useIsMobile';
import { Feed } from './Feed';
import { Generate } from './Generate';
import { Queue } from './Queue';
import { useGenerationStore } from '~/store/generation.store';
import { constants } from '~/server/common/constants';

type TabKey = (typeof tabKeys)[number];
const tabKeys = ['queue', 'generate', 'feed'] as const;

const schema = z.object({
  view: z.enum(tabKeys).optional(),
});

const useStyles = createStyles((theme) => ({
  panel: {
    padding: theme.spacing.md,
    height: 'calc(100vh - 54px)',

    [theme.fn.smallerThan('md')]: {
      height: 'calc(90vh - 54px)',
    },
  },
  tabsList: {
    gap: 0,
    borderTop: `1px solid ${
      theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[2]
    }`,
  },
  tab: {
    borderRadius: 0,
    flexDirection: 'column',
    gap: '4px',
  },
}));

export function GenerationDrawer() {
  const mobile = useIsMobile({ breakpoint: 'md' });
  const { classes } = useStyles();

  const opened = useGenerationStore((state) => state.drawerOpened);
  const toggleDrawer = useGenerationStore((state) => state.toggleDrawer);
  const view = useGenerationStore((state) => state.activeTab);
  const setView = useGenerationStore((state) => state.setActiveTab);

  // const [view, setView] = useLocalStorage({
  //   key: 'generate-drawer-view',
  //   defaultValue: (result.success ? result.data.view : undefined) ?? 'generate',
  // });

  const modelVersionId = useGenerationStore((state) => state.modelVersionId);
  const imageId = useGenerationStore((state) => state.imageId);

  return (
    <Drawer
      opened={opened}
      onClose={toggleDrawer}
      size={mobile ? '90%' : 600}
      position={mobile ? 'bottom' : 'right'}
      withCloseButton={false}
      zIndex={constants.imageGeneration.drawerZIndex}
    >
      <Tabs
        value={view}
        onTabChange={(value: TabKey | null) => (value ? setView(value) : undefined)}
        variant="pills"
        classNames={classes}
        keepMounted={false}
        inverted
      >
        <Tabs.Panel value="generate" pt={0}>
          <Generate
            onSuccess={() => setView('queue')}
            modelVersionId={modelVersionId}
            imageId={imageId}
          />
        </Tabs.Panel>
        <Tabs.Panel value="queue" py={0}>
          <Queue />
        </Tabs.Panel>
        <Tabs.Panel value="feed" py={0}>
          <Feed />
        </Tabs.Panel>

        <Tabs.List grow>
          <Tabs.Tab value="generate" icon={<IconBrush size={16} />} data-autofocus>
            Generate
          </Tabs.Tab>
          <Tabs.Tab value="queue" icon={<IconListDetails size={16} />}>
            Queue
          </Tabs.Tab>
          <Tabs.Tab value="feed" icon={<IconSlideshow size={16} />}>
            Feed
          </Tabs.Tab>
        </Tabs.List>
      </Tabs>
    </Drawer>
  );
}

type Props = Omit<DrawerProps, 'children' | 'size' | 'position' | 'withCloseButton'>;
