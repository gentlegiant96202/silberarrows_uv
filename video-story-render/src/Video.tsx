import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { MondayTemplate } from './templates/MondayTemplate';
import { TuesdayTemplate } from './templates/TuesdayTemplate';
import { WednesdayTemplate } from './templates/WednesdayTemplate';
import { ThursdayTemplate } from './templates/ThursdayTemplate';
import { FridayTemplate } from './templates/FridayTemplate';
import { SaturdayTemplate } from './templates/SaturdayTemplate';
import { SundayTemplate } from './templates/SundayTemplate';

const ContentPillarVideo = (props) => {
  const { dayOfWeek, templateType } = props;
  
  // Select template based on day
  const TemplateComponent = {
    monday: MondayTemplate,
    tuesday: TuesdayTemplate,
    wednesday: WednesdayTemplate,
    thursday: ThursdayTemplate,
    friday: FridayTemplate,
    saturday: SaturdayTemplate,
    sunday: SundayTemplate,
  }[dayOfWeek?.toLowerCase()] || MondayTemplate;
  
  return <TemplateComponent {...props} />;
};

const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="ContentPillar"
        component={ContentPillarVideo}
        durationInFrames={210} // 7 seconds at 30fps
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          dayOfWeek: 'monday',
          templateType: 'A',
          title: 'Sample Title',
          description: 'Sample Description',
          imageUrl: '',
          badgeText: 'MONDAY'
        }}
      />

      {/* Render arbitrary HTML for 7s at 1080x1920 */}
      <Composition
        id="HTMLVideo"
        component={({ html }: { html: string }) => (
          <div
            style={{
              width: '1080px',
              height: '1920px',
              overflow: 'hidden',
              background: 'black',
            }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
        durationInFrames={210}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ html: '<div />' }}
      />
    </>
  );
};

// Register the root component for Remotion v4+
registerRoot(RemotionRoot);
