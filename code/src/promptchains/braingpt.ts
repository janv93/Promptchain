import Communication from '../communication';
import { Approach, Step } from '../interfaces';

export default class BrainGpt extends Communication {
  private initialPrompt: string;
  private context: string;
  private approaches: Approach[];
  private bestApproach: Approach;

  constructor() {
    super();

    this.systemMessage = `You are an AI language model using the ${this.openAi.model} model from OpenAI API.
Your knowledge cutoff is September 2021. You do not have access to information later than that. You do not have access to the internet and you cannot consult anyone.
You are part of an algorithm which tries to solve any, even the most complex prompt using vector databases, chain of thought, reflection and correction and other techniques.
The goal is to solve the prompt just using your knowledge, you are not given tools. Consider this at every task.
Each step of this conversation tries to enhance the initial prompt and get closer to a complete answer.`;
  }

  public async chain(prompt): Promise<string[]> {
    this.resetChatMessages();
    this.initialPrompt = prompt;
    await this.generateContextIdeas();
    await this.generateContext();
    await this.generateApproaches();
    await this.filterApproaches();
    await this.generateSteps();
    await this.determineBestApproach();
    // this.bestApproach = {"approach":"Analyze current trends in AI research and development to determine the rate of progress towards achieving general intelligence.","steps":[{"step":"Gather data on current AI research and development trends.","steps":[{"step":"Identify reputable sources of information on AI research and development."},{"step":"Collect data on the current state of AI technology, including recent breakthroughs and advancements."},{"step":"Research the most promising areas of AI research, such as deep learning, natural language processing, and computer vision."},{"step":"Analyze funding trends in AI research and development to determine which areas are receiving the most investment."},{"step":"Consider the ethical implications of AI research and development, including issues related to bias, privacy, and job displacement."}]},{"step":"Analyze the rate of progress towards achieving general intelligence based on this data.","steps":[{"step":"Identify current AI research and development trends related to achieving general intelligence."},{"step":"Evaluate recent breakthroughs and advancements in AI that contribute to progress towards achieving general intelligence."},{"step":"Assess the limitations and obstacles that are slowing down progress towards achieving general intelligence."},{"step":"Consider potential future breakthroughs or advancements that could accelerate progress towards achieving general intelligence."}]},{"step":"Consider any potential breakthroughs or advancements that could accelerate progress towards the singularity.","steps":[{"step":"Identify current AI research and development trends related to achieving general intelligence."},{"step":"Evaluate recent breakthroughs and advancements in AI that contribute to progress towards achieving general intelligence."},{"step":"Assess the limitations and obstacles that are slowing down progress towards achieving general intelligence."},{"step":"Consider potential future breakthroughs or advancements that could accelerate progress towards achieving general intelligence."}]},{"step":"Evaluate any potential obstacles or limitations that could slow down progress towards the singularity.","steps":[{"step":"Identify potential limitations or obstacles that could slow down progress towards achieving general intelligence."},{"step":"Evaluate the current state of technology and research in relation to these limitations or obstacles."},{"step":"Consider potential solutions or workarounds for these limitations or obstacles, such as new algorithms or hardware advancements."},{"step":"Assess the feasibility and timeline for implementing these solutions or workarounds."},{"step":"Determine the potential impact of these limitations or obstacles on the timeline for achieving the singularity."}]},{"step":"Use all available information to make an informed prediction about the likelihood of the technological singularity occurring before 2030, expressed as a percentage.","steps":[{"step":"Identify potential limitations or obstacles that could slow down progress towards achieving general intelligence."},{"step":"Evaluate the current state of technology and research in relation to these limitations or obstacles."},{"step":"Consider potential solutions or workarounds for these limitations or obstacles, such as new algorithms or hardware advancements."},{"step":"Assess the feasibility and timeline for implementing these solutions or workarounds."},{"step":"Determine the potential impact of these limitations or obstacles on the timeline for achieving the singularity."}]}]}
    await this.executeBestApproach();

    const answer = this.messages;
    this.resetChatMessages();
    console.log(`${this.getCallCount()} calls were sent.`)
    return answer;
  }

  private async generateContextIdeas(): Promise<void> {
    console.log('Generating context...');

    const message = `You are being asked the following prompt:
"${this.initialPrompt}"
Generate a list contextual information that is helpful to answer the prompt.
For example when you are being asked a word with the same letter as the capital of France, the contextual information would be 1. Paris is the capital and 2. P is its starting letter.
Now apply similar enhancing to the prompt. Only output the numerated list, nothing before or after the list.`;

    await this.chat(message);
  }

  private async generateContext(): Promise<void> {
    const message = `Now add the actual information for each bullet point.`;
    await this.chat(message);
    this.context = this.lastMessage();
  }

  private async generateApproaches(): Promise<void> {
    console.log('Generating approaches...');
    this.resetChatMessages();

    const message = `You are being asked the following prompt:
"${this.initialPrompt}"
You were given the following context information:
${this.context}

Now, I want you to generate a list of approaches on how to find a solution for the prompt. Only generate approaches that you yourself can do from just memory. Only output the numerated list, nothing before or after the list.`

    await this.chat(message);
    const last = this.lastMessage();
    const approaches = this.getSteps(last);
    this.approaches = approaches.map(a => ({ approach: a }));
  }

  private async filterApproaches() {
    for (let i = this.approaches.length - 1; i >= 0; i--) {

      const message = `You are being asked the following prompt:
"${this.initialPrompt}"
This approach to solve the prompt was generated: "${this.approaches[i].approach}"
In order to solve this approach, is it necessary to access the internet or get in contact with a person?
Output a single string "yes" or "no" as an answer.`;

      const res = await this.chatSingle(message);
      const formatted = res.toLowerCase().replace(/[^a-z]/g, '');
      const removeApproach = formatted === 'yes' ? true : false;

      if (removeApproach) this.approaches.splice(i, 1);
    }
  }

  private async generateSteps() {
    console.log('Generating steps...');
    await Promise.all(this.approaches.map(a => this.generateApproachSteps(a)));
  }

  private async generateApproachSteps(approach: Approach): Promise<Approach> {
    const message = `To solve the prompt "${this.initialPrompt}" the following approach is given:
"${approach.approach}"

Generate a numerated list with steps for this approach. Only output the numerated list, nothing before or after the list.`;

    const res = await this.chatSingle(message);
    approach.steps = this.getSteps(res).map(s => ({ step: s }));

    for (let i = 0; i < approach.steps.length; i++) {
      await this.generateSubsteps(approach, approach.steps[i], [i]);
    }

    return approach;
  }

  private async generateSubsteps(approach: Approach, currentStep: Step, indexes: number[] = []) {
    const maxDepthReached = indexes.length > 1;
    if (maxDepthReached) return;
    const substeps = await this.getSubsteps(approach, currentStep, indexes);
    if (!substeps) return;

    currentStep.steps = substeps.map(s => ({ step: s }));

    for (let i = 0; i < currentStep.steps.length; i++) {
      const indexesSubstep = [...indexes];
      indexesSubstep.push(i);
      await this.generateSubsteps(approach, currentStep.steps[i], indexesSubstep);
    }
  }

  private async getSubsteps(approach: Approach, currentStep: Step, indexes: number[]): Promise<string[]> {
    const currentStepNumber = indexes.join('.');
    const needsSubsteps = await this.needsSubsteps(approach, currentStep, currentStepNumber);
    if (!needsSubsteps) return undefined;

    const message = `For the task "${approach.approach}" the following list of steps and substeps is given:
${this.createNumberedListString(approach.steps)}

Only consider step "${currentStepNumber} ${currentStep.step}".
Output a list of substeps for this step like this:
"1. substep 1
2. substep 2"

Only output the numerated list of substeps. Do not output any of the parent steps, only the list of substeps for this specific step. Output nothing before or after the list.`;

    const res = await this.chatSingle(message);
    const steps = this.getSteps(res);
    return steps;
  }

  private async needsSubsteps(approach: Approach, currentStep: Step, currentStepNumber: string): Promise<boolean> {
    const message = `For the task "${approach.approach}" the following list of steps and substeps is given:
${this.createNumberedListString(approach.steps)}

Only consider step "${currentStepNumber} ${currentStep.step}".
If the step is so complicated that it needs to split in substeps, output the string "yes", otherwise "no".
Only output the single word string, nothing before or after the word.`

    const res = await this.chatSingle(message);
    const formatted = res.toLowerCase().replace(/[^a-z]/g, '');
    return formatted === 'yes' ? true : false;
  }

  private async determineBestApproach(): Promise<void> {
    console.log('Picking best approach...');
    let message = `To solve the prompt "${this.initialPrompt}", a list of approaches and steps was generated:\n\n`;

    this.approaches.forEach((a, i) => {
      message += `Approach ${i + 1}: "${a.approach}":\n${this.createNumberedListString(a.steps)}\n\n`;
    });

    message += 'Which approach is the best to solve the prompt? You must pick one. Only output the approach number, nothing else:';
    this.setModel(4);
    const res = await this.chatSingle(message);
    this.setModel(3.5);
    const number = parseInt(res.match(/\d+/)?.[0] || '1');
    this.bestApproach = this.approaches[number - 1];
  }

  private async executeBestApproach(): Promise<void> {
    const stepsArray = this.flattenApproach(this.bestApproach);
    const resultsArray = [];

    for (let i = 0; i < stepsArray.length; i++) {
      const step = stepsArray[i];
      const previousSteps = stepsArray.slice(0, i);
      const stepsAndResults = previousSteps.map((s, j) => 'Step: ' + s + '\nAnswer: ' + resultsArray[j]);

      if (!stepsAndResults.length) {  // 1st step
        const result = await this.executeStep(step);
        resultsArray.push(result);
      } else {
        const summary = await this.summarizeSteps(stepsAndResults, step, 3000);
        const result = await this.executeStep(step, summary);
        resultsArray.push(result);
      }
    }
  }

  // turn approach into 1D array of steps
  private flattenApproach(approach: Approach, prefix: string = '', steps?: Step[]): string[] {
    steps = steps || approach.steps;
    const result: string[] = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepNumber = `${prefix}${i + 1}`;
      const stepString = `${stepNumber}. ${step.step}`;
      if (step.steps) result.push(...this.flattenApproach(approach, `${stepNumber}.`, step.steps));
      result.push(stepString);  // put 1 after 1.1 since usually the parent step is a summary of child steps -> better execution order
    }

    return result;
  }

  private async summarizeSteps(steps: string[], currentStep: string, limit: number): Promise<string> {
    const extractPromptStart = `To solve the prompt "${this.initialPrompt}" this approach was generated: "${this.bestApproach.approach}".
For this approach the following steps were generated:\n"`;

    const extractPromptEnd = `"\nExtract the key takeaways or a summary from these steps that are needed to execute the following next step:\n${currentStep}
Be concise. The summary will be provided to solve the next step. If there are no takeaways from these steps, output nothing.`;

    const parts = [];
    let lastJoined: string;
    let lastPartIndex = 0;

    steps.forEach((s, i) => {
      const currentSteps = steps.slice(lastPartIndex, i + 1);
      const joined = currentSteps.join('\n');
      const tokenSum = this.countTokens(extractPromptStart + joined + extractPromptEnd);

      if (tokenSum > limit) {
        parts.push(lastJoined);
        lastPartIndex = i;
      }
    });

    if (!parts.length) parts.push(steps.join('\n'));

    const extracts = await this.extractInfoFromPreviousSteps(parts, extractPromptStart, extractPromptEnd)
    return extracts.join('\n'); // TODO: for now join extracts, but in future summarize extracts so that sum is below token limit
  }

  private async extractInfoFromPreviousSteps(parts: string[], extractPromptStart: string, extractPromptEnd: string): Promise<string[]> {
    return Promise.all(parts.map(p => {
      const message = extractPromptStart + p + extractPromptEnd;
      return this.chatSingle(message);
    }));
  }

  private async executeStep(step: string, summary?: string): Promise<string> {
    let message: string;

    if (summary) {
      message = `To solve the prompt "${this.initialPrompt}" this approach was generated: "${this.bestApproach.approach}".
You are given the following helpful information from previous steps:
"${summary}".
With this information, solve the current step "${step}". Output a concise and short answer/execution to this step and take into consideration the above information.
If you can't answer this step, output nothing.`;
    } else {
      message = `To solve the prompt "${this.initialPrompt}" this approach was generated: "${this.bestApproach.approach}".
Solve the step "${step}". Output a concise and short answer/execution to this step.
If you can't answer this step, output nothing.`;
    }

    return this.chatSingle(message);
  }
}